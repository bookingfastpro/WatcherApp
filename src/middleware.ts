import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

const PROTECTED_PREFIXES = ["/espace", "/pro", "/admin"];

/**
 * Middleware (edge) :
 *  1. pose une Content-Security-Policy stricte avec nonce par requête ;
 *  2. redirige vers /connexion les visiteurs sans cookie de session sur les espaces privés.
 *
 * Ce contrôle est uniquement ergonomique : les autorisations réelles sont
 * systématiquement vérifiées côté serveur (src/server/auth/guards.ts).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !req.cookies.get(SESSION_COOKIE)
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "frame-ancestors 'none'",
    "frame-src 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
