#!/bin/sh
# Démarrage du conteneur : migrations → administrateur initial → (démo) → serveur.
set -e

# Contrôle de DATABASE_URL (erreur fréquente : "DATABASE_URL=" ou des guillemets collés dans la valeur).
# Seul le début de la valeur (avant le premier ":") est affiché : jamais le mot de passe.
case "$DATABASE_URL" in
  postgresql://*|postgres://*) ;;
  "") echo "[entrypoint] ERREUR : DATABASE_URL est vide. Renseignez-la dans les variables d environnement."; exit 1 ;;
  *) echo "[entrypoint] ERREUR : DATABASE_URL doit commencer par postgresql:// (elle commence par : \"${DATABASE_URL%%:*}\"). Collez uniquement l URL dans le champ Value, sans le nom de la variable ni guillemets."; exit 1 ;;
esac

node scripts/check-env.mjs

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
