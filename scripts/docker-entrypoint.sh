#!/bin/sh
# Démarrage du conteneur : migrations → administrateur initial → (démo) → serveur.
set -e

echo "[entrypoint] Application des migrations Prisma…"
./node_modules/.bin/prisma migrate deploy

# Crée un administrateur si INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD sont définis
# et qu'aucun administrateur n'existe encore.
node scripts/bootstrap-admin.mjs || echo "[entrypoint] bootstrap-admin ignoré (voir logs ci-dessus)."

if [ "$SEED_DEMO_DATA" = "true" ]; then
  echo "[entrypoint] ⚠ SEED_DEMO_DATA=true : chargement des données de DÉMONSTRATION."
  node prisma/seed.mjs
fi

echo "[entrypoint] Démarrage de Next.js sur le port ${PORT:-3000}"
exec ./node_modules/.bin/next start -H "${HOSTNAME:-0.0.0.0}" -p "${PORT:-3000}"
