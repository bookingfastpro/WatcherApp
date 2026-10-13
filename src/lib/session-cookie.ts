/** Partagé entre le middleware (edge) et le serveur (node). */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-watcher_sid" : "watcher_sid";

/** N'autorise que des chemins internes (anti open-redirect). */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.length > 300) return fallback;
  return value;
}
