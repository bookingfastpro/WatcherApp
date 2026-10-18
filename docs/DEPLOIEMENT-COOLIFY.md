# Déploiement sur Coolify

Deux méthodes, et une variante base de données **Supabase** (section dédiée plus bas). La **méthode A** (application Dockerfile + base PostgreSQL gérée par Coolify) est recommandée : sauvegardes de la base intégrées, redéploiement de l'application indépendant.

## Prérequis

- Un serveur Coolify (v4) avec un domaine pointant dessus (enregistrement DNS A/AAAA).
- Le dépôt poussé sur GitHub (public ou privé via l'app GitHub de Coolify).

```bash
git init
```

```bash
git add . && git commit -m "Watcher — MVP"
```

```bash
git remote add origin git@github.com:VOTRE-COMPTE/watcher.git
```

```bash
git push -u origin main
```

## Méthode A — Dockerfile + PostgreSQL Coolify

### 1. Base de données

Projet › **+ New** › **Database** › **PostgreSQL 16**. Démarrez-la, puis copiez l'**URL de connexion interne** (`postgres://…@<nom-du-service>:5432/postgres`). Ajoutez `?schema=public` à la fin pour `DATABASE_URL`.

Activez **Backups** (planification quotidienne, idéalement vers un stockage S3 externe).

### 2. Application

Projet › **+ New** › **Application** › votre dépôt GitHub › branche `main`.

- **Build Pack** : `Dockerfile`
- **Ports Exposes** : `3000`
- **Domains** : `https://watcher.votre-domaine.fr` (certificat Let's Encrypt automatique)
- **Health Check** : activé, chemin `/api/health`, port `3000` (le Dockerfile déclare aussi un `HEALTHCHECK`).

### 3. Variables d'environnement

Onglet **Environment Variables** (cochez « Is Build Variable ? » **uniquement** pour `NEXT_PUBLIC_APP_NAME`) :

```
APP_URL=https://watcher.votre-domaine.fr
NEXT_PUBLIC_APP_NAME=Watcher
APP_SECRET=<48 octets aléatoires en base64url>
TRUST_PROXY=true
DATABASE_URL=postgres://...:5432/postgres?schema=public

STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/app/storage

SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_FROM="Watcher <no-reply@votre-domaine.fr>"
ADMIN_NOTIFICATION_EMAIL=moderation@votre-domaine.fr

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

CRON_SECRET=<chaîne aléatoire longue>

INITIAL_ADMIN_EMAIL=vous@votre-domaine.fr
INITIAL_ADMIN_PASSWORD=<mot de passe long et unique>
SEED_DEMO_DATA=false
```

Générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 4. Stockage persistant

Onglet **Persistent Storage** › **+ Add** › Volume : destination `/app/storage`. Indispensable avec `STORAGE_DRIVER=local`, sinon les photos et documents sont perdus au redéploiement.

Alternative : `STORAGE_DRIVER=s3` avec un bucket **privé** (Scaleway Object Storage, OVH, AWS S3, Cloudflare R2…) et les variables `S3_*`.

### 5. Déployer

**Deploy**. Au démarrage, le conteneur :

1. applique les migrations (`prisma migrate deploy`) ;
2. crée l'administrateur initial s'il n'en existe aucun ;
3. démarre Next.js.

Connectez-vous avec l'administrateur, puis **supprimez `INITIAL_ADMIN_PASSWORD`** des variables et redéployez.

### 6. Tâche planifiée (purge RGPD)

Onglet **Scheduled Tasks** › **+ Add** :

- Nom : `maintenance`
- Fréquence : `0 3 * * *`
- Commande :

```bash
node -e "fetch('http://127.0.0.1:3000/api/cron/maintenance',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"
```

### 7. Stripe

Webhook : `https://watcher.votre-domaine.fr/api/stripe/webhook` (événements listés dans le README). Configurez ensuite les offres dans `/admin/abonnements`.

## Base de données sur Supabase (au lieu de PostgreSQL Coolify)

Supabase fournit un PostgreSQL managé. Watcher s'y connecte **directement par Prisma, côté serveur** : les paquets `@supabase/supabase-js` / `@supabase/ssr`, l'URL du projet et la clé *publishable* ne sont **pas** nécessaires (l'application a sa propre authentification, et cette clé est publique).

1. Supabase › votre projet › bouton **Connect** › onglet **Session pooler** (port `5432`, compatible IPv4 — la connexion « Direct » est en IPv6 uniquement). Copiez l'URL et remplacez `[YOUR-PASSWORD]` par le mot de passe de la base (Project Settings › Database ; s'il contient `@ / : # ?`, encodez-les : `@` → `%40`…).
2. Ajoutez `?schema=watcher` à la fin :

```
DATABASE_URL=postgresql://postgres.VOTRE-REF:MOT-DE-PASSE@aws-0-REGION.pooler.supabase.com:5432/postgres?schema=watcher
```

3. Dans Coolify, renseignez seulement cette `DATABASE_URL` (ne créez pas de ressource PostgreSQL). Les migrations s'appliquent au démarrage du conteneur.

N'utilisez pas le *Transaction pooler* (port `6543`) : il est incompatible avec les migrations Prisma.

**Sécurité.** Supabase expose automatiquement les tables du schéma `public` via son API REST, accessible avec la clé *publishable*. Deux protections empêchent tout accès aux données par ce biais :

- les tables sont créées dans le schéma dédié **`watcher`** (non exposé par défaut — ne l'ajoutez pas dans *Settings › API › Exposed schemas*) ;
- la **RLS est activée sur toutes les tables, sans aucune policy** (migration `20261019000000_enable_rls`) : les rôles `anon` / `authenticated` ne voient aucune ligne, tandis que l'application, propriétaire des tables, n'est pas affectée.

**Sauvegardes** : gérées par Supabase (selon votre offre). **Fichiers** : Supabase Storage est compatible S3 — `STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://VOTRE-REF.supabase.co/storage/v1/s3`, `S3_REGION` = région du projet, clés d'accès créées dans Storage › Settings › S3 Access Keys, bucket **privé**. Sinon, gardez `STORAGE_DRIVER=local` avec un volume Coolify.

## Méthode B — Docker Compose

Projet › **+ New** › **Docker Compose** › dépôt › fichier `docker-compose.yml`. Coolify crée l'application et la base PostgreSQL ensemble ; renseignez les variables (`APP_SECRET`, `POSTGRES_PASSWORD`, `APP_URL`…) dans l'onglet Environment Variables et associez le domaine au service `app` (port 3000). Les volumes `app-storage` et `db-data` sont persistants.

## Mises à jour

Chaque push sur `main` peut déclencher un redéploiement (Webhooks / Auto Deploy). Les migrations Prisma sont appliquées automatiquement ; pour une nouvelle migration en développement :

```bash
npx prisma migrate dev --name description_du_changement
```

Committez le dossier `prisma/migrations` généré.

## Dépannage

| Symptôme | Piste |
| --- | --- |
| « Configuration invalide : APP_SECRET doit être changé en production » | Générez un vrai secret |
| Healthcheck en échec (503) | `DATABASE_URL` incorrecte ou base non démarrée |
| Photos perdues après redéploiement | Volume `/app/storage` non monté |
| Abonnement non activé après paiement | Webhook Stripe : URL, événements ou `STRIPE_WEBHOOK_SECRET` |
| Emails non reçus | `SMTP_*`, SPF/DKIM/DMARC du domaine d'envoi ; en l'absence de SMTP les emails sont dans les logs |
| Adresses IP toutes identiques dans les journaux | `TRUST_PROXY=true` derrière le proxy Coolify |
