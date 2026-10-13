# Architecture

## 1. Analyse produit

**Problème.** Une montre volée se revend rarement « sous le manteau » : elle finit tôt ou tard chez un horloger (révision), un revendeur (reprise) ou une maison de ventes. Ces professionnels n'ont aucun moyen simple et fiable de savoir qu'une pièce a été déclarée volée.

**Proposition de valeur.**

- *Propriétaires* : une déclaration gratuite, guidée, qui rend leur montre « invendable » auprès des professionnels, sans exposer leur identité.
- *Professionnels* : un réflexe de vérification en quelques secondes, une preuve de diligence (historique horodaté), un canal confidentiel pour signaler une pièce suspecte.
- *Plateforme* : un tiers de confiance qui vérifie, modère, et fait le lien entre les parties sans divulguer les coordonnées.

**Tension centrale : utilité vs confidentialité / extraction.** La base n'a de valeur que si elle reste privée. D'où :

1. séparation physique des données (identification de la montre ↔ déclaration confidentielle ↔ documents) ;
2. une **projection de sécurité** unique pour tout ce qui sort vers un professionnel ;
3. une recherche conçue pour *vérifier* une montre, pas pour *parcourir* la base (correspondance exacte, critères discriminants, 10 résultats max, pas de pagination, quotas, détection d'anomalies, fiches accessibles uniquement après une recherche correspondante).

**Modèle économique.** Gratuit pour les particuliers (alimente la base), abonnement pour les professionnels (offres configurables, Stripe). Les partenariats commerciaux (mise en avant) sont strictement séparés du badge « Partenaire vérifié ».

## 2. Architecture technique

```
Navigateur ──HTTPS──► Reverse proxy Coolify (Traefik/Caddy)
                          │
                          ▼
              ┌───────────────────────── Next.js (Node 22) ─────────────────────────┐
              │ middleware.ts   CSP à nonce, redirection des espaces privés          │
              │ Server Components  → lecture via guards (requireUser/Admin/Pro…)     │
              │ Server Actions     → mutations validées (Zod) + autorisation + audit │
              │ Route Handlers     /api/files/* · /api/pro/search · /api/stripe/…    │
              │ src/server/*       seul code autorisé à toucher DB, stockage, Stripe │
              └───────┬───────────────────────┬──────────────────────┬───────────────┘
                      │                       │                      │
                PostgreSQL              Stockage privé          Stripe / SMTP
          (données, sessions,        (disque ou S3, jamais     (Checkout, Portal,
           rate limit, audit)          servi directement)        webhooks, emails)
```

Principes :

- **Serveur d'abord** : toute autorisation est vérifiée côté serveur (`src/server/auth/guards.ts`), au plus près des données. Le middleware n'est qu'une commodité.
- **`server-only`** sur tous les modules serveur : impossible de les importer par erreur dans un composant client.
- **Logique pure dans `src/lib`** (accès, permissions, politique de recherche, validation) : testable sans base.
- **Aucun état en mémoire requis** : sessions, rate limiting et paramètres sont en base → plusieurs instances possibles.

## 3. Schéma de données

Voir `prisma/schema.prisma` (commenté). Entités :

| Entité | Rôle | Visible des pros ? |
| --- | --- | --- |
| `User` | Compte (rôle, statut, consentements, verrouillage) | Non |
| `Session`, `AuthToken` | Sessions (hash du jeton), jetons email/reset (hash, usage unique) | Non |
| `ProfessionalProfile` | Entreprise, validation, client Stripe | Non |
| `Watch` | **Identification** : marque, modèle, référence, n° de série (+ formes normalisées indexées), caractéristiques, signes distinctifs | **Oui, via projection** |
| `WatchImage` | Photos (modération, visibilité pro) | Oui si autorisées |
| `TheftReport` | **Confidentiel** : propriétaire, statut, date/lieu, circonstances, plainte | Non (seuls statut, référence publique, mois du signalement) |
| `PrivateDocument` | Plainte, facture, Kbis… | **Jamais** |
| `ReportMessage` | Échanges propriétaire ↔ équipe | Non |
| `Partner` | Revendeurs de confiance (critères de vérification ≠ visibilité commerciale) | Public si publié |
| `Plan`, `Subscription`, `StripeEvent` | Offres configurables, abonnements synchronisés, idempotence webhooks | Non |
| `ProfessionalSearch` | Historique des recherches (critères, résultats, IP pseudonymisée, anomalies) | Le pro voit le sien |
| `Bookmark` | Dossiers suivis | Le pro voit les siens |
| `PotentialMatchReport` | Signalement de possession → admins uniquement | Le pro voit les siens |
| `AuditLog` | Journal d'audit (catégories ADMIN / SECURITY / ACCESS / BILLING / ACCOUNT) — équivalent élargi de « AdminAuditLog » | Non |
| `AppSetting`, `RateLimitBucket`, `DataRequest` | Paramètres, compteurs de débit, demandes RGPD | Non |

Relations clés : `TheftReport 1—1 Watch`, `Watch 1—n WatchImage`, `TheftReport 1—n PrivateDocument/ReportMessage/PotentialMatchReport`, `User 1—1 ProfessionalProfile 1—n Subscription`.

## 4. Rôles et permissions

| Capacité | Particulier | Professionnel | Admin |
| --- | :-: | :-: | :-: |
| Déclarer / modifier ses déclarations, ajouter des pièces | ✓ | ✓ | ✓ |
| Rechercher dans la base | — | ✓ si validé **et** abonné (ou en délai de grâce) | ✓ (journalisé) |
| Ouvrir une fiche déclaration | — | ✓ seulement si obtenue par une recherche < 24 h ou suivie | ✓ |
| Voir coordonnées propriétaire / plainte / factures | ses propres données | **jamais** | ✓ (accès journalisé) |
| Signaler une possession | — | ✓ | — |
| Gérer son abonnement | — | ✓ | — |
| Back-office | — | — | ✓ (404 pour les autres) |

Matrice codée dans `src/lib/permissions.ts` ; règles d'accès pro dans `src/lib/access.ts` ; toutes deux testées.

Statuts de déclaration : `PENDING` (en attente) → `VERIFIED` / `INFO_REQUESTED` / `REJECTED` → `RECOVERED`. Une modification des identifiants d'une montre vérifiée la renvoie en `PENDING`.

## 5. Arborescence des pages

```
/                                   Landing
/revendeurs-de-confiance            Liste + recherche          /[slug]  Fiche
/professionnels                     Offre pro
/confidentialite · /conditions · /mentions-legales
/connexion · /inscription · /inscription/professionnel
/mot-de-passe-oublie · /reinitialiser-mot-de-passe · /verifier-email

/espace                             Mes déclarations (cartes)
/espace/declarations/nouvelle       Assistant en 5 étapes
/espace/declarations/[id]           Détail, pièces, messagerie   /modifier
/espace/parametres                  Profil, mot de passe, RGPD

/pro                                Vérification (n° de série au centre)
/pro/declarations/[ref]             Fiche + signalement de possession
/pro/historique · /pro/favoris · /pro/signalements
/pro/abonnement · /pro/entreprise · /pro/compte

/admin                              Vue générale
/admin/declarations[/id] · /admin/utilisateurs[/id] · /admin/professionnels[/id]
/admin/validations · /admin/partenaires[/nouveau|/id] · /admin/abonnements
/admin/signalements[/id] · /admin/recherches · /admin/rgpd · /admin/audit · /admin/parametres

/api/health · /api/files/{image,document,partner-logo}/[id] · /api/pro/search
/api/account/export · /api/stripe/webhook · /api/cron/maintenance
```

## 6. Design system

- **Palette** (tokens dans `src/app/globals.css`) : `ink #0d0d0e`, `anthracite #1b1c1e`, `graphite #2b2c2f`, `slate`, `smoke`, `line`, `mist #eeede8`, `ivory #f6f5f1` (fond), `paper #fcfbf8` (cartes). Un unique accent laiton désaturé (`brass`) pour les numéros d'étapes et la mention « Mise en avant ». Couleurs sémantiques désaturées : `alert` (bordeaux), `ok` (vert sapin), `warn` (ocre).
- **Typographie** : *Cormorant Garamond* (titres, esprit horloger), *Hanken Grotesk* (interface), *IBM Plex Mono* (références, numéros de série).
- **Formes** : angles vifs, filets fins, beaucoup d'espace, ombres très légères. Surtitres en petites capitales espacées.
- **Motion** : un seul fondu d'entrée discret, respect de `prefers-reduced-motion`.
- **Composants** (`src/components/ui`) : `Button`/`ButtonLink`, `Input`/`Textarea`/`Select`/`Checkbox`/`Field`/`Fieldset`, `ActionForm` (erreurs par champ, toasts, confirmation modale, état de chargement), `Badge`/`DemoBadge`, `Card`, `PageHeader`, `EmptyState`, `Notice`, `Stat`, `DefinitionList`, `Table`, `Pagination`.
- **Responsive** : sidebar fixe sur desktop, menu plein écran sur mobile ; tableaux défilants ; formulaires en une colonne sous 640 px.
