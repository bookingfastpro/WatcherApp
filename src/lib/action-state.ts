import type { z } from "zod";

/** Contrat de retour de toutes les server actions utilisées avec useActionState. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Données non sensibles renvoyées au client (ex. drapeau "email non vérifié"). */
  data?: Record<string, unknown>;
  /** Incrémenté à chaque réponse pour déclencher les toasts même si le message est identique. */
  at?: number;
};

export const initialActionState: ActionState = { status: "idle" };

export function ok(message?: string, data?: Record<string, unknown>): ActionState {
  return { status: "success", message, data, at: Date.now() };
}

export function fail(message: string, fieldErrors?: ActionState["fieldErrors"], data?: Record<string, unknown>): ActionState {
  return { status: "error", message, fieldErrors, data, at: Date.now() };
}

export function fromZodError(error: z.ZodError, message = "Certains champs sont invalides."): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail(message, fieldErrors);
}
