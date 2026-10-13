// ─────────────────────────────────────────────────────────────────────────────
//  DONNÉES DE DÉMONSTRATION — NE JAMAIS EXÉCUTER SUR UNE BASE DE PRODUCTION RÉELLE
//
//  Toutes les données créées ici :
//   - portent isDemo = true (badge « Démonstration » affiché partout) ;
//   - ont des références "DEMO-XXXX-XXXX" et des numéros de série préfixés "DEMO" ;
//   - utilisent des emails en @demo.watcher.test (domaine réservé, non routable) ;
//   - sont exclues des statistiques publiques.
//  Le script est idempotent : il supprime puis recrée les données de démonstration.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { newKey, putObject } from "../scripts/lib/storage.mjs";

// Charge .env en local (sans écraser les variables déjà définies, ex. en conteneur).
try {
  process.loadEnvFile();
} catch {
  /* pas de fichier .env */
}

const db = new PrismaClient();
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 };
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "Demonstration-2026";

const norm = (v) => (v ? v.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "") : null);
const normText = (v) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const daysAgo = (n) => new Date(Date.now() - n * 24 * 3600 * 1000);

/** Visuel de démonstration : cadran stylisé + mention DÉMONSTRATION (aucune vraie photo). */
async function demoImage(label, dial) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `<line x1="${400 + Math.sin(a) * 170}" y1="${400 - Math.cos(a) * 170}" x2="${400 + Math.sin(a) * 200}" y2="${400 - Math.cos(a) * 200}" stroke="#f6f5f1" stroke-width="6"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="800" height="800" fill="#e2e0da"/>
    <circle cx="400" cy="400" r="250" fill="#1b1c1e"/>
    <circle cx="400" cy="400" r="220" fill="${dial}"/>
    ${ticks}
    <line x1="400" y1="400" x2="400" y2="260" stroke="#f6f5f1" stroke-width="10" stroke-linecap="round"/>
    <line x1="400" y1="400" x2="500" y2="460" stroke="#f6f5f1" stroke-width="8" stroke-linecap="round"/>
    <text x="400" y="720" font-family="Helvetica, Arial" font-size="34" fill="#1b1c1e" text-anchor="middle" letter-spacing="6">DÉMONSTRATION</text>
    <text x="400" y="90" font-family="Georgia, serif" font-size="34" fill="#54565b" text-anchor="middle">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

function demoPdf(title) {
  const text = `DOCUMENT DE DEMONSTRATION - ${title}`;
  const content = `BT /F1 18 Tf 60 760 Td (${text}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function cleanDemo() {
  const demoUsers = await db.user.findMany({ where: { isDemo: true }, select: { id: true } });
  const ids = demoUsers.map((u) => u.id);
  const demoReports = await db.theftReport.findMany({ where: { OR: [{ isDemo: true }, { ownerId: { in: ids } }] }, select: { id: true, watchId: true } });
  await db.potentialMatchReport.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { theftReportId: { in: demoReports.map((r) => r.id) } }] } });
  await db.privateDocument.deleteMany({ where: { OR: [{ uploadedById: { in: ids } }, { theftReportId: { in: demoReports.map((r) => r.id) } }] } });
  await db.watch.deleteMany({ where: { id: { in: demoReports.map((r) => r.watchId) } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.partner.deleteMany({ where: { isDemo: true } });
  // Note : les fichiers de démonstration précédemment stockés ne sont pas supprimés (sans impact).
}

async function user(email, data) {
  const now = new Date();
  return db.user.create({
    data: {
      email,
      passwordHash: await hash(DEMO_PASSWORD, ARGON),
      emailVerifiedAt: now,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      isDemo: true,
      ...data,
    },
  });
}

const WATCHES = [
  { ref: "DEMO-7K3M-9QX2", brand: "Rolex", model: "Submariner Date", reference: "126610LN", serial: "DEMO0001", year: 2021, material: "Acier Oystersteel", size: 41, dial: "Noir", strap: "Bracelet Oyster acier", marks: "Légère rayure sur la lunette à 3 h (démonstration)", status: "VERIFIED", age: 40, color: "#101010" },
  { ref: "DEMO-4HNT-2BWC", brand: "Omega", model: "Speedmaster Professional Moonwatch", reference: "310.30.42.50.01.002", serial: "DEMO0002", year: 2022, material: "Acier", size: 42, dial: "Noir", strap: "Bracelet acier", marks: null, status: "VERIFIED", age: 25, color: "#1a1a1a" },
  { ref: "DEMO-8PRD-5ZKE", brand: "Cartier", model: "Santos de Cartier", reference: "WSSA0018", serial: "DEMO0003", year: 2020, material: "Acier", size: 40, dial: "Argenté", strap: "Bracelet acier QuickSwitch", marks: "Gravure au dos (démonstration)", status: "PENDING", age: 3, color: "#c9c7c0" },
  { ref: "DEMO-2FJV-6MTA", brand: "Patek Philippe", model: "Aquanaut", reference: "5167A-001", serial: "DEMO0004", year: 2019, material: "Acier", size: 40, dial: "Noir dégradé", strap: "Bracelet composite", marks: null, status: "INFO_REQUESTED", age: 12, color: "#2b2c2f" },
  { ref: "DEMO-9WQS-3CXN", brand: "Tudor", model: "Black Bay Fifty-Eight", reference: "M79030N-0001", serial: "DEMO0005", year: 2021, material: "Acier", size: 39, dial: "Noir", strap: "Bracelet rivets acier", marks: null, status: "RECOVERED", age: 90, color: "#141414" },
];

async function main() {
  console.info("⚠  Chargement des DONNÉES DE DÉMONSTRATION…");
  await cleanDemo();

  // ─── Offres (configurables ensuite dans /admin/abonnements)
  for (const plan of [
    { code: "pro-mensuel", name: "Professionnel mensuel", interval: "MONTH", sortOrder: 1, stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || null },
    { code: "pro-annuel", name: "Professionnel annuel", interval: "YEAR", sortOrder: 2, stripePriceId: process.env.STRIPE_PRICE_PRO_YEARLY || null },
  ]) {
    await db.plan.upsert({
      where: { code: plan.code },
      update: {},
      create: {
        ...plan,
        priceCents: null, // prix volontairement non fixé : à définir dans l'admin
        description: plan.interval === "YEAR" ? "Engagement annuel" : "Sans engagement",
        features: ["Recherche par numéro de série", "Recherche avancée", "Historique des vérifications", "Signalement confidentiel"],
      },
    });
  }

  // ─── Comptes
  const admin = await user("admin@demo.watcher.test", { role: "ADMIN", firstName: "Admin", lastName: "Démo" });
  const owner = await user("particulier@demo.watcher.test", { role: "INDIVIDUAL", firstName: "Camille", lastName: "Démo" });
  const proUser = await user("pro@demo.watcher.test", { role: "PROFESSIONAL", firstName: "Alex", lastName: "Démo", phone: "+33 1 00 00 00 00" });
  const pendingUser = await user("pro-attente@demo.watcher.test", { role: "PROFESSIONAL", firstName: "Sacha", lastName: "Démo" });

  const monthly = await db.plan.findUnique({ where: { code: "pro-mensuel" } });
  const proProfile = await db.professionalProfile.create({
    data: {
      userId: proUser.id,
      companyName: "Horlogerie Démo (fictive)",
      legalName: "DÉMO SAS",
      registrationNumber: "DEMO-00000000000000",
      activity: "WATCHMAKER",
      addressLine: "1 rue de la Démonstration",
      postalCode: "75000",
      city: "Paris",
      country: "FR",
      phone: "+33 1 00 00 00 00",
      verificationStatus: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
      subscriptions: {
        create: {
          source: "MANUAL",
          status: "ACTIVE",
          planId: monthly?.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          note: "Accès de démonstration",
        },
      },
    },
  });
  const pendingKey = newKey("documents", "pdf");
  const pendingPdf = demoPdf("KBIS FICTIF");
  await putObject(pendingKey, pendingPdf, "application/pdf");
  await db.professionalProfile.create({
    data: {
      userId: pendingUser.id,
      companyName: "Bijouterie Démo en attente (fictive)",
      registrationNumber: "DEMO-11111111111111",
      activity: "JEWELER",
      addressLine: "2 avenue de l'Exemple",
      postalCode: "69000",
      city: "Lyon",
      country: "FR",
      phone: "+33 4 00 00 00 00",
      documents: {
        create: {
          kind: "BUSINESS_REGISTRATION",
          storageKey: pendingKey,
          mimeType: "application/pdf",
          sizeBytes: pendingPdf.length,
          sha256: createHash("sha256").update(pendingPdf).digest("hex"),
          originalName: "kbis-demonstration.pdf",
          uploadedById: pendingUser.id,
        },
      },
    },
  });

  // ─── Montres déclarées (fictives)
  for (const w of WATCHES) {
    const img = await demoImage(`${w.brand} — ${w.model}`, w.color);
    const imgKey = newKey("images", "webp");
    await putObject(imgKey, img, "image/webp");
    const pdf = demoPdf(`PLAINTE FICTIVE ${w.ref}`);
    const pdfKey = newKey("documents", "pdf");
    await putObject(pdfKey, pdf, "application/pdf");

    const watch = await db.watch.create({
      data: {
        brand: w.brand,
        brandNormalized: normText(w.brand),
        model: w.model,
        modelNormalized: normText(w.model),
        reference: w.reference,
        referenceNormalized: norm(w.reference),
        serialNumber: w.serial,
        serialNormalized: norm(w.serial),
        yearApprox: w.year,
        caseMaterial: w.material,
        caseSizeMm: w.size,
        dialColor: w.dial,
        strap: w.strap,
        distinctiveMarks: w.marks,
        images: { create: { storageKey: imgKey, mimeType: "image/webp", sizeBytes: img.length, width: 800, height: 800, moderationStatus: "APPROVED" } },
      },
    });
    await db.theftReport.create({
      data: {
        publicRef: w.ref,
        ownerId: owner.id,
        watchId: watch.id,
        status: w.status,
        theftDate: daysAgo(w.age + 2),
        theftCity: "Paris",
        theftCountry: "FR",
        circumstances: "[DONNÉES DE DÉMONSTRATION] Circonstances fictives.",
        privateDescription: "[DONNÉES DE DÉMONSTRATION] Aucune donnée réelle.",
        policeReportFiled: true,
        policeReportNumber: `DEMO-PV-${w.serial}`,
        policeService: "Service fictif (démonstration)",
        ownerCertifiedAt: daysAgo(w.age),
        statusReason: w.status === "INFO_REQUESTED" ? "Merci de transmettre une preuve d'achat (demande fictive)." : null,
        verifiedAt: w.status === "VERIFIED" ? daysAgo(w.age - 1) : null,
        verifiedById: w.status === "VERIFIED" ? admin.id : null,
        recoveredAt: w.status === "RECOVERED" ? daysAgo(10) : null,
        isDemo: true,
        createdAt: daysAgo(w.age),
        documents: {
          create: {
            kind: "POLICE_REPORT",
            storageKey: pdfKey,
            mimeType: "application/pdf",
            sizeBytes: pdf.length,
            sha256: createHash("sha256").update(pdf).digest("hex"),
            originalName: "plainte-demonstration.pdf",
            uploadedById: owner.id,
            moderationStatus: w.status === "VERIFIED" ? "APPROVED" : "PENDING",
          },
        },
        messages: {
          create: [
            { kind: "SYSTEM", fromAdmin: true, body: "Déclaration de démonstration enregistrée.", createdAt: daysAgo(w.age) },
            ...(w.status === "INFO_REQUESTED"
              ? [{ kind: "INFO_REQUEST", fromAdmin: true, authorId: admin.id, body: "Merci de transmettre une preuve d'achat (demande fictive).", createdAt: daysAgo(w.age - 1) }]
              : []),
          ],
        },
      },
    });
  }

  // ─── Partenaires (fictifs)
  const partners = [
    {
      slug: "atelier-demo-paris",
      name: "Atelier Démo — Paris",
      city: "Paris",
      country: "FR",
      specialties: ["Montres vintage", "Restauration", "Expertise"],
      shortDescription: "Partenaire FICTIF de démonstration : atelier d'horlogerie spécialisé dans la restauration de montres anciennes.",
      description: "Cette fiche est une donnée de démonstration. Elle illustre la présentation d'un revendeur de confiance vérifié.",
      website: "https://example.com",
      verified: true,
      verifiedAt: new Date(),
      verificationCriteria: { identityChecked: true, registrationChecked: true, premisesChecked: true, charterSigned: true },
      sortOrder: 1,
    },
    {
      slug: "maison-exemple-lyon",
      name: "Maison Exemple — Lyon",
      city: "Lyon",
      country: "FR",
      specialties: ["Occasion certifiée", "Reprise"],
      shortDescription: "Partenaire FICTIF de démonstration : revendeur de montres d'occasion (non vérifié, mise en avant).",
      isSponsored: true,
      tier: "PREMIUM",
      sortOrder: 2,
    },
    {
      slug: "comptoir-fictif-geneve",
      name: "Comptoir Fictif — Genève",
      city: "Genève",
      country: "CH",
      specialties: ["Haute horlogerie", "Ventes aux enchères"],
      shortDescription: "Partenaire FICTIF de démonstration : maison de ventes spécialisée en haute horlogerie.",
      verified: true,
      verifiedAt: new Date(),
      verificationCriteria: { identityChecked: true, registrationChecked: true, premisesChecked: true, charterSigned: true, referencesChecked: true },
      sortOrder: 3,
    },
  ];
  for (const p of partners) await db.partner.create({ data: { ...p, isPublished: true, isDemo: true } });

  await db.auditLog.create({ data: { category: "ADMIN", action: "system.demo_seeded", metadata: { watches: WATCHES.length, partners: partners.length } } });

  console.info(`
✔ Données de démonstration chargées (mot de passe commun : ${DEMO_PASSWORD})
   Administrateur        admin@demo.watcher.test
   Particulier           particulier@demo.watcher.test
   Professionnel validé  pro@demo.watcher.test        (accès manuel 1 an)
   Pro en attente        pro-attente@demo.watcher.test
   Numéros de série à tester côté pro : DEMO0001 … DEMO0005
`);
  void proProfile;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
