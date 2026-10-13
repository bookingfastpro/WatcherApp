const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateTimeFmt.format(new Date(d));
}

/** Date volontairement imprécise (mois + année) — utilisée pour les professionnels. */
export function formatMonth(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return monthFmt.format(new Date(d));
}

export function formatPrice(cents: number | null | undefined, currency = "EUR"): string | null {
  if (cents === null || cents === undefined) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function fullName(u: { firstName?: string | null; lastName?: string | null; email?: string }): string {
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return n || u.email || "—";
}
