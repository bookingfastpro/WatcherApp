import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

type Message = {
  id: string;
  kind: string;
  body: string;
  fromAdmin: boolean;
  createdAt: Date;
};

const KIND_TITLE: Record<string, string> = {
  INFO_REQUEST: "Demande d'informations",
  STATUS_CHANGE: "Changement de statut",
  SYSTEM: "Notification",
  MESSAGE: "",
};

/** Fil chronologique propriétaire ↔ équipe de vérification. `viewer` inverse l'alignement. */
export function MessageThread({ messages, viewer }: { messages: Message[]; viewer: "owner" | "admin" }) {
  if (!messages.length) return <p className="text-sm text-smoke">Aucun échange pour le moment.</p>;
  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const mine = viewer === "owner" ? !m.fromAdmin : m.fromAdmin;
        const system = m.kind === "SYSTEM" || m.kind === "STATUS_CHANGE";
        return (
          <li key={m.id} className={cn("flex", system ? "justify-center" : mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] px-4 py-3 text-sm leading-relaxed",
                system && "border-y border-line bg-transparent text-center text-slate",
                !system && mine && "bg-ink text-ivory",
                !system && !mine && "border border-line bg-paper text-anthracite",
                m.kind === "INFO_REQUEST" && "border-l-2 border-l-warn",
              )}
            >
              {KIND_TITLE[m.kind] ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">{KIND_TITLE[m.kind]}</p> : null}
              <p className="whitespace-pre-line">{m.body}</p>
              <p className={cn("mt-2 text-[11px]", mine && !system ? "text-ivory/50" : "text-smoke")}>
                {m.fromAdmin ? "Équipe de vérification" : viewer === "owner" ? "Vous" : "Déclarant"} · {formatDateTime(m.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
