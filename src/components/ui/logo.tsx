import Link from "next/link";
import { cn } from "@/lib/utils";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Watcher";

/** Logo image. `onLight` : version noire pour les fonds clairs (par défaut blanche, pour les fonds sombres). */
export function LogoImage({ onLight, className }: { onLight?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={onLight ? "/logo-dark.png" : "/logo.png"}
      alt={APP_NAME}
      width={720}
      height={100}
      className={cn("h-5 w-auto", className)}
    />
  );
}

export function Logo({ onLight, className, href = "/" }: { onLight?: boolean; className?: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center" aria-label={`${APP_NAME} — accueil`}>
      <LogoImage onLight={onLight} className={className} />
    </Link>
  );
}
