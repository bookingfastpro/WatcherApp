/**
 * Les en-têtes de sécurité "statiques" sont définis ici.
 * La Content-Security-Policy (avec nonce par requête) est posée dans src/middleware.ts.
 * Fichier .mjs (et non .ts) : aucune dépendance à TypeScript au runtime du conteneur.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Photos + justificatifs envoyés dans le formulaire de déclaration.
      bodySizeLimit: "60mb",
    },
  },
  serverExternalPackages: ["@node-rs/argon2", "sharp"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
