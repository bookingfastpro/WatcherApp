"use client";

import { Check, Eye, EyeOff, X } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { ActionForm } from "@/components/ui/action-form";
import { cn } from "@/lib/utils";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function IconSubmit({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      title={label}
      aria-label={label}
      className={cn("inline-flex size-8 items-center justify-center border border-line bg-paper text-slate transition-colors hover:border-anthracite hover:text-ink", className)}
    >
      {children}
    </button>
  );
}

export function ImageModerationButtons({
  action,
  imageId,
  visible,
  status,
}: {
  action: Action;
  imageId: string;
  visible: boolean;
  status: string;
}) {
  const form = (op: string, label: string, icon: React.ReactNode, className?: string) => (
    <ActionForm action={action} showInlineError={false}>
      <input type="hidden" name="imageId" value={imageId} />
      <input type="hidden" name="op" value={op} />
      <IconSubmit label={label} className={className}>
        {icon}
      </IconSubmit>
    </ActionForm>
  );
  return (
    <div className="flex gap-1.5">
      {status !== "APPROVED" ? form("approve", "Approuver", <Check className="size-4" />, "hover:text-ok") : null}
      {status !== "REJECTED" ? form("reject", "Rejeter (masquée aux pros)", <X className="size-4" />, "hover:text-alert") : null}
      {form("toggle", visible ? "Masquer aux professionnels" : "Rendre visible aux professionnels", visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />)}
    </div>
  );
}

export function DocumentModerationButtons({ action, documentId, status }: { action: Action; documentId: string; status: string }) {
  const form = (s: string, label: string, icon: React.ReactNode, className?: string) => (
    <ActionForm action={action} showInlineError={false}>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="status" value={s} />
      <IconSubmit label={label} className={className}>
        {icon}
      </IconSubmit>
    </ActionForm>
  );
  return (
    <div className="flex gap-1.5">
      {status !== "APPROVED" ? form("APPROVED", "Marquer comme conforme", <Check className="size-4" />, "hover:text-ok") : null}
      {status !== "REJECTED" ? form("REJECTED", "Marquer comme non conforme", <X className="size-4" />, "hover:text-alert") : null}
    </div>
  );
}
