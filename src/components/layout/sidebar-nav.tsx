"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LogoImage } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number; exact?: boolean };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function Links({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3" aria-label="Navigation de l'espace">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-[13.5px] transition-colors duration-150",
                  active ? "bg-white/[0.08] text-ivory" : "text-ivory/60 hover:bg-white/[0.04] hover:text-ivory",
                )}
              >
                <span className="[&>svg]:size-4" aria-hidden>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="min-w-5 bg-ivory px-1.5 text-center text-[11px] font-semibold leading-5 text-ink">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SidebarNav({
  items,
  mobile,
  section,
  footer,
}: {
  items: NavItem[];
  mobile?: boolean;
  section?: string;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  if (!mobile) return <Links items={items} />;

  return (
    <div className="sticky top-0 z-40 bg-ink text-ivory lg:hidden">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoImage className="h-4" />
          <span className="eyebrow !text-ivory/60">{section}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="inline-flex size-10 items-center justify-center"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open ? (
        <div className="fixed inset-x-0 bottom-0 top-16 flex flex-col bg-ink pt-2 fade-in">
          <Links items={items} onNavigate={() => setOpen(false)} />
          {footer}
        </div>
      ) : null}
    </div>
  );
}
