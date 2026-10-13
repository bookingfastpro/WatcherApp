import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { env } from "./env";

export type RequestMeta = { ip: string; ipHash: string; userAgent: string | null };

function extractIp(h: Headers): string {
  if (env().TRUST_PROXY) {
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}

/**
 * Les adresses IP ne sont jamais stockées en clair : on conserve un HMAC (pseudonymisation,
 * minimisation RGPD) qui permet malgré tout de corréler des comportements anormaux.
 */
export function hashIp(ip: string): string {
  return createHmac("sha256", env().APP_SECRET).update(ip).digest("hex").slice(0, 32);
}

export function metaFromHeaders(h: Headers): RequestMeta {
  const ip = extractIp(h);
  return { ip, ipHash: hashIp(ip), userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

export async function getRequestMeta(): Promise<RequestMeta> {
  return metaFromHeaders(await headers());
}

/** Protection CSRF pour les route handlers utilisant le cookie de session. */
export function isSameOrigin(h: Headers): boolean {
  const origin = h.get("origin");
  if (!origin) return h.get("sec-fetch-site") === "same-origin";
  // Hors du try : une configuration invalide doit échouer explicitement, pas se déguiser en 403.
  const expected = new URL(env().APP_URL).host;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  let o: string;
  try {
    o = new URL(origin).host;
  } catch {
    return false;
  }
  return o === expected || o === host;
}
