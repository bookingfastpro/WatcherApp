import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { runMaintenance } from "@/server/maintenance";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

/**
 * Tâche planifiée (Coolify > Scheduled Tasks), par exemple chaque nuit :
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/maintenance
 */
export async function POST(req: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET non configuré", { status: 503 });
  const provided = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });

  const result = await runMaintenance();
  await audit({ category: "ADMIN", action: "system.maintenance", metadata: result });
  return Response.json({ ok: true, ...result });
}
