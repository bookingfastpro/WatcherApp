# Déploiement sur Coolify

Deux méthodes. La **méthode A** (application Dockerfile + base PostgreSQL gérée par Coolify) est recommandée : sauvegardes de la base intégrées, redéploiement de l'application indépendant.

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
