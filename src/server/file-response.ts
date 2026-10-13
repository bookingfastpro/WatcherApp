import "server-only";

export const ID_PATTERN = /^[a-z0-9]{20,40}$/;

export function notFoundResponse(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

/** Réponse binaire durcie : pas de sniffing, pas d'exécution, cache privé court. */
export function fileResponse(
  body: Buffer,
  mimeType: string,
  opts: { filename?: string; download?: boolean; cache?: "private" | "public" } = {},
): Response {
  const headers = new Headers({
    "Content-Type": mimeType,
    "Content-Length": String(body.length),
    "X-Content-Type-Options": "nosniff",
    // Un document ouvert dans le navigateur ne peut exécuter aucun script.
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": opts.cache === "public" ? "public, max-age=86400" : "private, max-age=300",
  });
  if (opts.filename) {
    const safe = opts.filename.replace(/[^\w.\- ]/g, "_");
    headers.set(
      "Content-Disposition",
      `${opts.download ? "attachment" : "inline"}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(opts.filename)}`,
    );
  }
  return new Response(new Uint8Array(body), { status: 200, headers });
}
