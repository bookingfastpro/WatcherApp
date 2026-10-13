"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type Item = { href: string; label: string };

export function MobileMenu({ items, cta, secondary }: { items: Item[]; cta: Item; secondary?: Item }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center text-ivory"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div id="mobile-nav" className="fixed inset-x-0 bottom-0 top-18 z-50 flex flex-col bg-ink px-6 pb-10 pt-6 fade-in">
          <nav className="flex flex-col">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-4 font-display text-2xl text-ivory"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            {secondary ? (
              <Link href={secondary.href} className="flex h-12 items-center justify-center border border-white/25 text-ivory">
                {secondary.label}
              </Link>
            ) : null}
            <Link href={cta.href} className="flex h-12 items-center justify-center bg-ivory font-medium text-ink">
              {cta.label}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
