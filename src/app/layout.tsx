import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ZoomLock } from "@/components/layout/zoom-lock";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Watcher";

// Toutes les pages sont rendues à la demande (CSP à nonce, données par utilisateur) :
// aucun accès à la base n'est tenté pendant `next build`.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Registre des montres volées`, template: `%s · ${APP_NAME}` },
  description:
    "Déclarez gratuitement une montre volée. Professionnels vérifiés : contrôlez l'historique d'une montre avant achat, reprise ou réparation.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0e",
  width: "device-width",
  initialScale: 1,
  // Zoom bloqué sur mobile et tablette (complété par touch-action en CSS et ZoomLock pour Safari iOS).
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lecture des en-têtes : force le rendu dynamique, requis par la CSP à nonce (middleware).
  await headers();
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster />
        <ZoomLock />
      </body>
    </html>
  );
}
