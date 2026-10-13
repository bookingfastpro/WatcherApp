# Sécurité

## Authentification et sessions

- Mots de passe hachés en **Argon2id** (m = 19 MiB, t = 2 — recommandations OWASP) ; politique : 12 caractères min., lettres + chiffres, liste de mots de passe courants refusée.
- Vérification email obligatoire avant accès ; lien confirmé par **clic explicite** (POST) pour ne pas être consommé par les antivirus de messagerie.
- Jetons (session, vérification, réinitialisation) : 256 bits aléatoires, **seul le hash SHA-256 est stocké**, usage unique, expiration (48 h / 1 h). La réinitialisation révoque toutes les sessions.
- Cookie `__Host-watcher_sid` : `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. Durée : 12 h (admin), 7 j (pro), 14 j (particulier). Sessions révocables par l'utilisateur (changement de mot de passe) et par l'admin.
- Anti-énumération : messages génériques à l'inscription, à la connexion et au mot de passe oublié ; temps de réponse égalisé pour les comptes inexistants.
- Verrouillage 15 min après 5 échecs ; limitation de débit par IP et par email.

## Autorisations

- Vérifiées **côté serveur** dans chaque page, action et route (`src/server/auth/guards.ts`) ; le middleware ne fait qu'une redirection ergonomique.
- Les routes d'administration renvoient **404** aux non-administrateurs.
- Ressources référencées par identifiant : contrôle systématique d'appartenance (`findFirst({ where: { id, ownerId } })`).
- Server Actions liées (`action.bind(null, id)`) : l'identifiant est re-vérifié côté serveur, jamais considéré comme fiable.

## Protection de la base contre l'extraction

| Mesure | Détail |
| --- | --- |
| Projection unique | `SAFE_REPORT_SELECT` (`src/server/search.ts`) — test de non-régression dédié |
| Correspondance exacte | N° de série normalisé, ≥ 4 caractères ; pas de recherche partielle sur le n° |
| Critères discriminants | Marque seule refusée ; référence, n° de série, ou marque + modèle requis |
| Plafond | 10 résultats, **aucune pagination**, aucun endpoint de liste |
| Débit | 15 recherches/min/utilisateur et 45/min/IP (paramétrable) |
| Quota | 200 recherches/jour/pro (paramétrable) |
| Anomalies | Seuil horaire → recherche marquée, événement SECURITY, email aux admins |
| Anti-énumération des fiches | Fiche accessible seulement après une recherche correspondante < 24 h, ou si suivie ; références publiques aléatoires (base32, non séquentielles) |
| Images | Servies uniquement aux pros ayant ce droit sur la fiche ; 600 images/h max par compte |
| Masquage | N° de série masqué en recherche avancée (paramétrable) |
| Traçabilité | Chaque recherche est journalisée (critères, résultats, IP pseudonymisée) |

## Fichiers

- Type réel vérifié par signature binaire (JPEG, PNG, WebP, PDF) ; extension et Content-Type client ignorés.
- Images **ré-encodées** (sharp) : suppression EXIF/GPS, neutralisation des polyglottes, limite de pixels.
- Clés de stockage générées côté serveur (UUID), jamais dérivées du nom de fichier ; protection path traversal sur le driver local.
- Aucun accès direct : `/api/files/*` vérifie les droits à chaque requête. Réponses avec `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cross-Origin-Resource-Policy: same-origin`, cache privé court.
- Consultation d'un document par un administrateur : journalisée (`admin.document_viewed`).

## En-têtes et navigateur

- CSP stricte à **nonce par requête** + `strict-dynamic` ; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action` limité (+ Stripe).
- HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` restrictive, `Cross-Origin-Opener-Policy`.
- CSRF : Server Actions protégées par Next (vérification d'origine) ; route JSON `/api/pro/search` avec contrôle d'origine explicite ; cookie `SameSite=Lax`.
- Redirections post-connexion limitées aux chemins internes (anti open-redirect, testé).

## Données et injections

- Prisma : requêtes paramétrées ; l'unique requête SQL brute (`rate-limit.ts`) utilise des *tagged templates* paramétrés.
- Toutes les entrées validées par Zod côté serveur (longueurs bornées, énumérations, formats).
- Rendu React (échappement automatique) ; contenus des emails échappés.

## Stripe

- Signature des webhooks vérifiée ; idempotence par table `stripe_events` (réessai possible en cas d'échec).
- Aucune donnée bancaire ne transite par l'application (Checkout / Portal hébergés).

## Journalisation (audit trail)

`AuditLog` : connexions/échecs/verrouillages, réinitialisations, actions admin (statuts, validations, suspensions, anonymisations, partenaires, paramètres), accès sensibles (fiches, documents, profils), facturation. Adresses IP pseudonymisées (HMAC avec `APP_SECRET`). Consultation filtrable dans `/admin/audit`, purge selon la durée de conservation configurée.

## Pistes d'évolution

- Authentification à deux facteurs (TOTP / WebAuthn) — **recommandée pour les administrateurs** avant la production.
- Rôles admin différenciés (modérateur / super-admin) et double validation pour l'anonymisation.
- Scan antivirus des PDF (ClamAV) ; conversion des PDF en images pour consultation.
- WAF / protection bot en amont (Cloudflare, etc.).
