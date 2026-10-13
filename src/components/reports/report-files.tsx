"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { DOCUMENT_KIND_LABEL, MODERATION_LABEL } from "@/lib/labels";
import { formatBytes, formatDate } from "@/lib/format";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function DeleteFileButton({ action, fileId, fileType }: { action: Action; fileId: string; fileType: "image" | "document" }) {
  return (
    <ActionForm
      action={action}
      showInlineError={false}
      confirm={{
        title: "Supprimer ce fichier ?",
        description: "Le fichier sera définitivement supprimé de nos serveurs.",
        confirmLabel: "Supprimer",
        tone: "danger",
      }}
    >
      <input type="hidden" name="fileId" value={fileId} />
      <input type="hidden" name="fileType" value={fileType} />
      <button type="submit" className="inline-flex size-8 items-center justify-center text-smoke transition-colors hover:text-alert" aria-label="Supprimer">
        <Trash2 className="size-4" />
      </button>
    </ActionForm>
  );
}

export function DocumentList({
  documents,
  deleteAction,
}: {
  documents: { id: string; kind: string; originalName: string; sizeBytes: number; createdAt: Date; moderationStatus: string }[];
  deleteAction?: Action;
}) {
  if (!documents.length) return <p className="text-sm text-smoke">Aucun justificatif pour le moment.</p>;
  return (
    <ul className="divide-y divide-line border-y border-line">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-4 py-3">
          <FileText className="size-5 shrink-0 text-smoke" aria-hidden />
          <div className="min-w-0 flex-1">
            <a href={`/api/files/document/${d.id}`} target="_blank" rel="noopener" className="block truncate text-sm text-ink hover:underline">
              {d.originalName}
            </a>
            <p className="text-xs text-smoke">
              {DOCUMENT_KIND_LABEL[d.kind]} · {formatBytes(d.sizeBytes)} · {formatDate(d.createdAt)} · {MODERATION_LABEL[d.moderationStatus]}
            </p>
          </div>
          {deleteAction ? <DeleteFileButton action={deleteAction} fileId={d.id} fileType="document" /> : null}
        </li>
      ))}
    </ul>
  );
}

export function AddFilesForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} className="grid gap-5" resetOnSuccess>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Photos" name="photos" hint="JPEG, PNG, WebP — 10 Mo max.">
          <Input
            id="photos"
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="h-auto py-2.5 file:mr-3 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm"
          />
        </Field>
        <div className="grid gap-3">
          <Field label="Justificatifs" name="documents" hint="PDF, JPEG, PNG — 15 Mo max.">
            <Input
              id="documents"
              name="documents"
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="h-auto py-2.5 file:mr-3 file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-sm"
            />
          </Field>
          <Select name="documentKind" aria-label="Type de justificatif" defaultValue="POLICE_REPORT">
            {["POLICE_REPORT", "PURCHASE_INVOICE", "OWNERSHIP_PROOF", "OTHER"].map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <SubmitButton variant="secondary" pendingLabel="Envoi sécurisé…">
          <Upload className="size-4" aria-hidden /> Ajouter les fichiers
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
