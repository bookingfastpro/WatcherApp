# Watcher — registre privé des montres déclarées volées

Plateforme SaaS permettant :

- aux **particuliers** de déclarer gratuitement une montre volée, de joindre leurs justificatifs et de suivre la vérification ;
- aux **professionnels vérifiés et abonnés** (horlogers, bijoutiers, revendeurs, maisons de vente, experts…) de contrôler une montre avant achat, reprise ou réparation — **sans jamais accéder aux données personnelles des victimes** ;
- aux **administrateurs** de modérer, valider, gérer les abonnements, les partenaires et d'auditer toutes les actions sensibles.

> Le nom affiché (« Watcher ») est configurable via `NEXT_PUBLIC_APP_NAME`.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack et choix techniques](#stack-et-choix-techniques)
3. [Démarrage local](#démarrage-local)
4. [Comptes et données de démonstration](#comptes-et-données-de-démonstration)
5. [Variables d'environnement](#variables-denvironnement)
6. [Stripe](#stripe)
7. [Stockage des fichiers](#stockage-des-fichiers)
8. [Emails](#emails)
9. [Déploiement sur Coolify](#déploiement-sur-coolify)
10. [Scripts](#scripts)
11. [Tests](#tests)
12. [Structure du projet](#structure-du-projet)
13. [Avant la mise en production](#avant-la-mise-en-production)

Documentation détaillée : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/SECURITE.md`](docs/SECURITE.md) · [`docs/RGPD.md`](docs/RGPD.md) · [`docs/DEPLOIEMENT-COOLIFY.md`](docs/DEPLOIEMENT-COOLIFY.md)

---

## Fonctionnalités

| Espace | Fonctionnalités |
| --- | --- |
| **Public** | Landing premium, page « Revendeurs de confiance » (recherche ville / pays / spécialité, fiche détaillée, critères du badge publiés), page Professionnels (offres configurables), pages légales modèles |
| **Authentification** | Inscription particulier / professionnel, vérification email (clic explicite), connexion avec verrouillage progressif, mot de passe oublié, sessions révocables |
| **Particulier** (`/espace`) | Tableau de bord en cartes, déclaration guidée en 5 étapes (photos + plainte + facture), modification, ajout/suppression de pièces, messagerie avec l'équipe, « montre retrouvée », paramètres, export RGPD, demande de suppression |
| **Professionnel** (`/pro`) | Recherche par numéro de série au centre de l'écran, recherche avancée, alerte « MONTRE SIGNALÉE VOLÉE », fiche déclaration, signalement de possession, dossiers suivis, historique horodaté, abonnement (Stripe Checkout + Customer Portal + factures), profil entreprise, API JSON |
| **Administration** (`/admin`) | Vue générale, déclarations (modération, statuts, photos, documents, doublons de n° de série), utilisateurs (suspension, révocation de sessions, anonymisation), professionnels, file de validation, partenaires, offres & abonnements (dont accès manuels), signalements, journal des recherches (anomalies), demandes RGPD, journal d'audit, paramètres |

## Stack et choix techniques

| Domaine | Choix | Pourquoi |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router, Server Components, Server Actions), **TypeScript strict** | Logique sensible exécutée côté serveur par construction, un seul déploiement |
| UI | **Tailwind CSS 4**, composants maison accessibles, `lucide-react`, `sonner` | Design system sur mesure, sans dépendance lourde |
| Base | **PostgreSQL** + **Prisma 6** | Migrations versionnées, requêtes paramétrées (anti-injection) |
| Auth | **Implémentation dédiée** : Argon2id, sessions en base (jeton aléatoire, seul le hash est stocké), cookie `__Host-` httpOnly | Révocation immédiate, contrôle total, pas de JWT impossible à invalider |
| Validation | **Zod 4** (messages en français) | Mêmes schémas côté client et serveur ; le serveur fait foi |
| Paiement | **Stripe** Checkout + Customer Portal + webhooks | Aucune donnée de carte ne transite par l'application |
| Fichiers | Driver **disque local** ou **S3 compatible** ; images ré-encodées (sharp) | Suppression EXIF/GPS, neutralisation des fichiers piégés |
| Rate limiting | Compteurs atomiques **dans PostgreSQL** | Partagé entre instances, sans Redis |
| Emails | **Nodemailer** (SMTP) ; logs serveur en développement | Fournisseur interchangeable |
| Tests | **Vitest** | Règles critiques (accès, recherche, fichiers, projection de sécurité) |

## Démarrage local

### Option A — tout en Docker (le plus simple)

```bash
cp .env.example .env
```

Éditez `.env` : remplacez `APP_SECRET` (voir la commande dans le fichier) et, pour tester avec des données fictives, mettez `SEED_DEMO_DATA=true`.

```bash
docker compose up --build
```

Application : <http://localhost:3000>. Les migrations sont appliquées automatiquement au démarrage.

### Option B — Node.js sur la machine + PostgreSQL en conteneur

Prérequis : Node.js ≥ 20.18 (22 recommandé).

```bash
docker compose -f docker-compose.dev.yml up -d
```

```bash
cp .env.example .env
```

```bash
npm install
```

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

```bash
npm run dev
```

> En mode développement, `APP_SECRET` peut rester la valeur d'exemple. `npm start` (production) **refuse** cette valeur : générez un vrai secret.

Les emails (vérification, réinitialisation…) s'affichent dans le terminal tant que `SMTP_HOST` est vide : copiez le lien affiché.

## Comptes et données de démonstration

Le seed (`npm run db:seed`, ou `SEED_DEMO_DATA=true` en Docker) crée des données **fictives**, identifiées partout par le badge « Démonstration », des références `DEMO-XXXX-XXXX`, des numéros de série `DEMO0001`…`DEMO0005` et des emails en `@demo.watcher.test`. Elles sont exclues des statistiques publiques. Le mot de passe commun est affiché à la fin du seed (modifiable via `DEMO_PASSWORD`).

| Rôle | Email |
| --- | --- |
| Administrateur | `admin@demo.watcher.test` |
| Particulier (5 déclarations) | `particulier@demo.watcher.test` |
| Professionnel validé (accès manuel 1 an) | `pro@demo.watcher.test` |
| Professionnel en attente de validation | `pro-attente@demo.watcher.test` |

**Ne chargez jamais ces données sur une instance de production réelle.**

Créer un vrai administrateur :

```bash
npm run admin:create -- admin@votre-domaine.fr "un-mot-de-passe-long-et-unique"
```

## Variables d'environnement

Toutes sont documentées dans [`.env.example`](.env.example). Où trouver les vraies valeurs :

| Variable | Obligatoire | Où la trouver / comment la générer |
| --- | --- | --- |
| `APP_URL` | oui | URL publique, ex. `https://watcher.example.fr` |
| `APP_SECRET` | oui | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `DATABASE_URL` | oui | Coolify (ressource PostgreSQL) ou **Supabase** (Session pooler + `?schema=watcher`, voir docs/DEPLOIEMENT-COOLIFY.md) |
| `STORAGE_DRIVER` | non | `local` (volume persistant) ou `s3` |
| `S3_*` | si `s3` | Console de votre fournisseur S3 (Scaleway, OVH, AWS, R2, MinIO…) — bucket **privé** |
| `SMTP_*`, `EMAIL_FROM` | recommandé | Votre fournisseur d'email transactionnel (Brevo, Postmark, Mailjet, SES…) |
| `ADMIN_NOTIFICATION_EMAIL` | recommandé | Boîte de l'équipe de modération |
| `STRIPE_SECRET_KEY` | pour les abonnements | Dashboard Stripe › Développeurs › Clés API |
| `STRIPE_WEBHOOK_SECRET` | pour les abonnements | Dashboard Stripe › Développeurs › Webhooks › votre endpoint › « Signing secret » |
| `STRIPE_PRICE_PRO_*` | non | IDs `price_…` pré-remplis par le seed ; sinon configurables dans `/admin/abonnements` |
| `CRON_SECRET` | recommandé | Chaîne aléatoire longue (tâche de purge) |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | premier démarrage | Crée l'admin si aucun n'existe — **retirez-les ensuite** |
| `SEED_DEMO_DATA` | non | `true` uniquement pour une instance de démonstration |

## Stripe

1. **Produits et prix** : Dashboard Stripe › Catalogue de produits › créez un produit « Accès professionnel » avec un prix mensuel et un prix annuel (récurrents). Les prix ne sont **pas** codés en dur dans l'application.
2. **Offres** : dans `/admin/abonnements`, renseignez pour chaque offre l'ID `price_…`, le prix affiché (facultatif) et les avantages. Une offre sans ID de prix est présentée mais non souscriptible.
3. **Webhook** : Dashboard › Développeurs › Webhooks › Ajouter un endpoint `https://VOTRE-DOMAINE/api/stripe/webhook` avec les événements :
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copiez le *signing secret* dans `STRIPE_WEBHOOK_SECRET`.
4. **Customer Portal** : Dashboard › Paramètres › Facturation › Portail client : activez la gestion du moyen de paiement, l'historique des factures, l'annulation et (si souhaité) le changement d'offre entre vos deux prix.
5. **Test en local** avec la CLI Stripe :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.

**Contrôle d'accès** : l'accès pro exige un compte validé **et** un abonnement `ACTIVE`/`TRIALING` ; en cas d'impayé (`PAST_DUE`/`UNPAID`), l'accès est maintenu pendant le délai de grâce configurable (`/admin/parametres`, 7 jours par défaut), puis bloqué automatiquement. Les administrateurs peuvent accorder des **accès manuels** datés (partenaires, essais) sans Stripe.

## Stockage des fichiers

- Aucun fichier n'est public : tout passe par `/api/files/*`, qui vérifie l'autorisation **à chaque requête** et journalise les accès aux documents par les administrateurs.
- `STORAGE_DRIVER=local` : fichiers dans `STORAGE_LOCAL_DIR` (`/app/storage` en conteneur) — **montez un volume persistant**.
- `STORAGE_DRIVER=s3` : bucket privé (aucune policy publique). Activez le chiffrement côté serveur du bucket chez votre fournisseur. Profil MinIO fourni : `docker compose --profile s3 up`.
- Photos : 8 max, 10 Mo, JPEG/PNG/WebP, ré-encodées en WebP (métadonnées supprimées). Documents : 10 max, 15 Mo, PDF/JPEG/PNG/WebP. Le type réel est vérifié par signature binaire.

## Emails

Envoyés via SMTP : confirmation d'adresse, réinitialisation, évolution d'une déclaration, message de l'équipe, décision de validation pro, notifications internes (nouvelle déclaration, pro à valider, signalement de possession, volume de recherche anormal, demande RGPD).

## Déploiement sur Coolify

Résumé (guide pas à pas : [`docs/DEPLOIEMENT-COOLIFY.md`](docs/DEPLOIEMENT-COOLIFY.md)) :

1. Poussez le dépôt sur GitHub.
2. Coolify › New Resource › **PostgreSQL** (16) ; notez l'URL de connexion interne.
3. Coolify › New Resource › **Application** › votre dépôt › Build Pack **Dockerfile**, port **3000**.
4. Variables d'environnement : au minimum `APP_URL`, `APP_SECRET`, `DATABASE_URL`, puis SMTP, Stripe, `CRON_SECRET`, `INITIAL_ADMIN_*` pour le premier démarrage.
5. **Persistent Storage** : volume monté sur `/app/storage` (si `STORAGE_DRIVER=local`).
6. Healthcheck : `/api/health` (déjà déclaré dans le Dockerfile).
7. **Scheduled Task** quotidienne :

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/maintenance
```

Alternative : ressource **Docker Compose** avec `docker-compose.yml` (app + PostgreSQL).

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run typecheck` · `npm run lint` · `npm test` | Qualité |
| `npm run db:migrate` | Créer/appliquer une migration en développement |
| `npm run db:deploy` | Appliquer les migrations (production) |
| `npm run db:seed` | Données de démonstration |
| `npm run db:studio` | Explorer la base |
| `npm run admin:create -- <email> <mdp>` | Créer ou promouvoir un administrateur |

## Tests

```bash
npm test
```

Couvrent : politique de recherche anti-extraction, normalisation des numéros, règles d'accès et délai de grâce, matrice de permissions, badge partenaire, détection du type réel des fichiers, validation des entrées, anti open-redirect, et un **test de non-régression de sécurité** garantissant que la projection envoyée aux professionnels ne contient aucun champ confidentiel.

## Structure du projet

```
prisma/               schéma, migrations, seed de démonstration
scripts/              entrypoint Docker, création d'administrateur
src/
  app/
    (public)/         landing, revendeurs de confiance, professionnels, pages légales
    (auth)/           connexion, inscriptions, mot de passe, vérification email
    espace/           espace particulier
    pro/              espace professionnel
    admin/            back-office
    api/              fichiers privés, webhook Stripe, recherche pro, export RGPD, santé, cron
  components/         design system (ui/), layouts, composants métier
  lib/                logique pure et testée (accès, permissions, politique de recherche, validation)
  server/             code serveur uniquement : auth, sessions, actions, stockage, Stripe, audit, rate limit
  middleware.ts       CSP à nonce + redirection des espaces privés
tests/                tests unitaires (Vitest)
docs/                 architecture, sécurité, RGPD, déploiement
```

## Avant la mise en production

- [ ] Faire valider par un **professionnel du droit** : politique de confidentialité, CGU, mentions légales, base légale du traitement de données relatives à des infractions (art. 10 RGPD), durées de conservation, politique d'anonymisation, registre des traitements, éventuelle AIPD. Voir [`docs/RGPD.md`](docs/RGPD.md).
- [ ] Compléter les passages `[ … ]` des pages légales.
- [ ] Générer `APP_SECRET`, `CRON_SECRET` ; configurer SMTP (SPF/DKIM/DMARC), Stripe (mode live), stockage persistant ou S3 privé chiffré.
- [ ] Créer l'administrateur puis retirer `INITIAL_ADMIN_*`. Ne pas activer `SEED_DEMO_DATA`.
- [ ] Définir les prix dans Stripe puis dans `/admin/abonnements`.
- [ ] Mettre en place les sauvegardes PostgreSQL (Coolify › Backups) et du stockage.
- [ ] Planifier la tâche de maintenance quotidienne.
