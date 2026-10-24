import { getSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** Indique seulement si la session est encore valide (utilisé au retour sur l'onglet). */
export async function GET() {
  const session = await getSession();
  return Response.json({ authenticated: Boolean(session) }, { headers: { "Cache-Control": "no-store" } });
}
