"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import { FieldErrorsContext } from "./form-context";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export const PendingContext = createContext(false);

/**
 * Soumission manuelle d'une server action.
 * React 19 réinitialise les champs d'un <form action={…}> après chaque soumission, y compris
 * en cas d'erreur de validation : on soumet donc via startTransition pour conserver la saisie.
 */
export function useManualAction(action: Action) {
  const [state, dispatch, isPending] = useActionState(action, initialActionState);
  const submit = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    startTransition(() => dispatch(fd));
  };
  return { state, isPending, submit };
}

type Confirm = { title: string; description?: string; confirmLabel?: string; tone?: "default" | "danger" };

type ActionFormProps = {
  action: Action;
  children: React.ReactNode;
  className?: string;
  confirm?: Confirm;
  resetOnSuccess?: boolean;
  showInlineError?: boolean;
  onResult?: (state: ActionState) => void;
};

/** Formulaire relié à une server action : erreurs par champ, toasts, confirmation, chargement. */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess,
  showInlineError = true,
  onResult,
}: ActionFormProps) {
  const { state, isPending, submit } = useManualAction(action);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!state.at) return;
    if (state.status === "success") {
      if (state.message) toast.success(state.message);
      if (resetOnSuccess) formRef.current?.reset();
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
    onResult?.(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.at]);

  return (
    <FieldErrorsContext.Provider value={state.fieldErrors ?? {}}>
      <PendingContext.Provider value={isPending}>
        <form
          ref={formRef}
          className={className}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (isPending) return;
            if (confirm) dialogRef.current?.showModal();
            else submit(e.currentTarget);
          }}
        >
          {showInlineError && state.status === "error" && state.message && !state.fieldErrors ? (
            <div role="alert" className="mb-5 border-l-2 border-alert bg-alert-soft px-4 py-3 text-sm text-alert">
              {state.message}
            </div>
          ) : null}
          {children}
        </form>
        {confirm ? (
          <dialog
            ref={dialogRef}
            className="m-auto w-[min(92vw,440px)] border border-line bg-paper p-0 text-anthracite shadow-[var(--shadow-float)] backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
          >
            <div className="p-7">
              <h2 className="font-display text-2xl text-ink">{confirm.title}</h2>
              {confirm.description ? <p className="mt-3 text-sm leading-relaxed text-slate">{confirm.description}</p> : null}
              <div className="mt-7 flex justify-end gap-3">
                <button type="button" className={buttonClasses("secondary", "md")} onClick={() => dialogRef.current?.close()}>
                  Annuler
                </button>
                <button
                  type="button"
                  autoFocus
                  className={buttonClasses(confirm.tone === "danger" ? "danger" : "primary", "md")}
                  onClick={() => {
                    dialogRef.current?.close();
                    if (formRef.current) submit(formRef.current);
                  }}
                >
                  {confirm.confirmLabel ?? "Confirmer"}
                </button>
              </div>
            </div>
          </dialog>
        ) : null}
      </PendingContext.Provider>
    </FieldErrorsContext.Provider>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingLabel,
  pending: pendingProp,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  pendingLabel?: string;
  pending?: boolean;
}) {
  const ctx = useContext(PendingContext);
  const pending = pendingProp ?? ctx;
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn(buttonClasses(variant, size), className)}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
