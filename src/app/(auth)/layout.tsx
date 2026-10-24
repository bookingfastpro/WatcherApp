import { Logo, LogoImage } from "@/components/ui/logo";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-ivory lg:flex">
        <Logo />
        <DialOrnament />
        <div className="relative max-w-md">
          <p className="font-display text-[2.4rem] leading-[1.1]">
            Chaque montre a une histoire. Nous aidons à ce qu'elle ne soit pas réécrite.
          </p>
          <div className="mt-10 flex items-start gap-3 border-t border-white/10 pt-6 text-sm text-ivory/55">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Vos informations personnelles et vos justificatifs ne sont jamais visibles des professionnels.
              Seules les caractéristiques de la montre sont consultables, par des comptes vérifiés.
            </p>
          </div>
        </div>
      </aside>
      <main className="flex min-h-dvh flex-col bg-white lg:bg-ivory">
        <div className="flex justify-center pt-12 pb-2 lg:hidden">
          {/* Mobile et tablette : logo non cliquable (pas de retour vers la page d'accueil). */}
          <LogoImage onLight />
        </div>
        <div className="flex flex-1 items-start justify-center px-6 pt-8 pb-12 text-center lg:items-center lg:py-12 lg:px-10 lg:text-left">
          <div className="w-full max-w-[520px] fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Ornement discret : graduation d'un cadran, en filigrane. */
function DialOrnament() {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      className="pointer-events-none absolute -right-40 top-1/2 size-[640px] -translate-y-1/2 text-white/[0.07]"
    >
      <circle cx="200" cy="200" r="196" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="0.5" />
      {ticks.map((i) => {
        const a = (i / 60) * Math.PI * 2;
        const long = i % 5 === 0;
        const r1 = long ? 168 : 178;
        return (
          <line
            key={i}
            x1={200 + Math.sin(a) * r1}
            y1={200 - Math.cos(a) * r1}
            x2={200 + Math.sin(a) * 188}
            y2={200 - Math.cos(a) * 188}
            stroke="currentColor"
            strokeWidth={long ? 2 : 0.75}
          />
        );
      })}
    </svg>
  );
}
