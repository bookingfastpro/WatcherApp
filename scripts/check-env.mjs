// Vérifie au démarrage les variables d'environnement indispensables (mêmes règles que src/server/env.ts).
// Affiche les NOMS des variables en défaut, jamais leurs valeurs. Quitte avec le code 1 si l'une est invalide.
const e = process.env;
const problems = [];

const isUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

if (e.APP_URL && !isUrl(e.APP_URL)) {
  problems.push("APP_URL : doit être une adresse complète commençant par https:// (ex. https://watcher.mondomaine.fr).");
}
if (!e.APP_SECRET) {
  problems.push("APP_SECRET : manquante. Générez-en une (48 octets aléatoires).");
} else if (e.APP_SECRET.length < 32) {
  problems.push(`APP_SECRET : trop courte (${e.APP_SECRET.length} caractères, 32 minimum).`);
} else if (e.NODE_ENV === "production" && e.APP_SECRET.startsWith("change-me")) {
  problems.push("APP_SECRET : valeur d'exemple (change-me…) interdite en production.");
}
if (e.SMTP_PORT && !/^\d+$/.test(e.SMTP_PORT)) problems.push("SMTP_PORT : doit être un nombre (ex. 587).");
if (e.STORAGE_DRIVER === "s3") {
  for (const k of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
    if (!e[k]) problems.push(`${k} : requise avec STORAGE_DRIVER=s3.`);
  }
}
if (e.STORAGE_DRIVER && !["local", "s3"].includes(e.STORAGE_DRIVER)) {
  problems.push("STORAGE_DRIVER : doit valoir local ou s3.");
}

if (problems.length) {
  console.error("[entrypoint] ERREUR : variables d'environnement invalides :");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("[entrypoint] Corrigez-les dans Coolify (Environment Variables), puis redéployez.");
  process.exit(1);
}
console.log("[entrypoint] Variables d'environnement : OK");
