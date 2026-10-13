import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const e = env();
  if (!e.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure: e.SMTP_SECURE,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export type Mail = { to: string; subject: string; html: string; text: string };

/**
 * Envoi d'email. Sans SMTP configuré (développement), le contenu est écrit dans les logs
 * serveur — pratique pour récupérer les liens de vérification en local.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.info(`\n[email:dev] À : ${mail.to}\n[email:dev] Objet : ${mail.subject}\n${mail.text}\n`);
    return;
  }
  try {
    await t.sendMail({ from: env().EMAIL_FROM, ...mail });
  } catch (error) {
    // L'échec d'envoi ne doit pas bloquer l'action utilisateur ; il est tracé.
    console.error("[email] échec d'envoi", mail.subject, error);
  }
}

export async function notifyAdmins(subject: string, text: string): Promise<void> {
  const to = env().ADMIN_NOTIFICATION_EMAIL;
  if (!to) return;
  const { layout } = await import("./templates");
  await sendMail({ to, subject: `[Admin] ${subject}`, text, html: layout(subject, `<p>${escapeHtml(text).replace(/\n/g, "<br>")}</p>`) });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
