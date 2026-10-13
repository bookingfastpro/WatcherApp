import { getSession } from "@/server/auth/session";
import { getProContext } from "@/server/auth/guards";
import { runProSearch } from "@/server/search";
import { isSameOrigin, metaFromHeaders } from "@/server/request";
import { searchInputSchema } from "@/lib/search-policy";

export const dynamic = "force-dynamic";

/**
 * API de recherche professionnelle (JSON). Mêmes garanties que l'interface :
 * session + accès pro effectif, politique anti-extraction, quotas, journalisation.
 * Aucun endpoint ne permet de lister ou paginer la base.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });

  const session = await getSession();
  if (!session) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const ctx = await getProContext();
  if (!ctx?.access.allowed) return Response.json({ error: "Accès professionnel requis.", reason: ctx?.access.reason }, { status: 403 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }
  const parsed = searchInputSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: "Requête invalide." }, { status: 400 });

  const outcome = await runProSearch(session.user, metaFromHeaders(req.headers), parsed.data);
  if (!outcome.ok) {
    const status = outcome.code === "INVALID" ? 422 : 429;
    return Response.json({ error: outcome.error, code: outcome.code }, { status });
  }
  return Response.json(
    { results: outcome.results, truncated: outcome.truncated, remainingToday: outcome.remainingToday },
    { headers: { "Cache-Control": "no-store" } },
  );
}
