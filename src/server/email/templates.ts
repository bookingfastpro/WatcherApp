import "server-only";
import { appUrl } from "../env";
import { escapeHtml, type Mail } from "./mailer";

const APP = process.env.NEXT_PUBLIC_APP_NAME ?? "Watcher";

export function layout(title: string, body: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f6f2;font-family:Helvetica,Arial,sans-serif;color:#1b1c1e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e1dc">
<tr><td style="padding:28px 36px;background:#0d0d0e"><img src="${escapeHtml(appUrl("/logo.png"))}" alt="${escapeHtml(APP)}" width="144" height="20" style="display:block;border:0;height:20px;width:auto"></td></tr>
<tr><td style="padding:36px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 20px">${escapeHtml(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#2b2c2f">${body}</div>
</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #e3e1dc;font-size:12px;color:#8b8c90">
Message automatique — merci de ne pas y répondre directement.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(href: string, text: string): string {
  return `<p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#0d0d0e;color:#f7f6f2;text-decoration:none;padding:14px 26px;font-size:14px;letter-spacing:.04em">${escapeHtml(text)}</a></p>
<p style="font-size:12px;color:#8b8c90;word-break:break-all">Si le bouton ne fonctionne pas : ${escapeHtml(href)}</p>`;
}

export function verificationEmail(to: string, token: string): Mail {
  const url = appUrl(`/verifier-email?token=${encodeURIComponent(token)}`);
  return {
    to,
    subject: `Confirmez votre adresse email — ${APP}`,
    text: `Bienvenue sur ${APP}.\n\nConfirmez votre adresse email en ouvrant ce lien (valable 48 h) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: layout(
      "Confirmez votre adresse email",
      `<p>Bienvenue sur ${escapeHtml(APP)}.</p><p>Pour activer votre compte, confirmez votre adresse email. Ce lien est valable 48 heures.</p>${button(url, "Confirmer mon adresse")}<p>Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.</p>`,
    ),
  };
}

export function passwordResetEmail(to: string, token: string): Mail {
  const url = appUrl(`/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`);
  return {
    to,
    subject: `Réinitialisation de votre mot de passe — ${APP}`,
    text: `Une demande de réinitialisation de mot de passe a été effectuée.\n\nLien (valable 1 h) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.`,
    html: layout(
      "Réinitialisation du mot de passe",
      `<p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte. Ce lien est valable 1 heure.</p>${button(url, "Choisir un nouveau mot de passe")}<p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.</p>`,
    ),
  };
}

export function reportUpdateEmail(to: string, publicRef: string, reportId: string, headline: string, detail?: string): Mail {
  const url = appUrl(`/espace/declarations/${reportId}`);
  return {
    to,
    subject: `Déclaration ${publicRef} — ${headline}`,
    text: `${headline}\n\n${detail ?? ""}\n\nConsulter la déclaration : ${url}`,
    html: layout(
      headline,
      `<p>Votre déclaration <strong>${escapeHtml(publicRef)}</strong> a été mise à jour.</p>${
        detail ? `<p style="padding:16px;background:#f7f6f2;border-left:2px solid #1b1c1e">${escapeHtml(detail).replace(/\n/g, "<br>")}</p>` : ""
      }${button(url, "Consulter ma déclaration")}`,
    ),
  };
}

export function professionalDecisionEmail(to: string, approved: boolean, note?: string): Mail {
  const url = appUrl(approved ? "/pro/abonnement" : "/pro");
  const title = approved ? "Votre compte professionnel est validé" : "Votre demande de compte professionnel";
  const intro = approved
    ? "Votre compte professionnel a été validé. Vous pouvez dès à présent souscrire un abonnement pour accéder à la base de vérification."
    : "Après examen, nous ne sommes pas en mesure de valider votre compte professionnel en l'état.";
  return {
    to,
    subject: `${title} — ${APP}`,
    text: `${intro}\n\n${note ?? ""}\n\n${url}`,
    html: layout(
      title,
      `<p>${escapeHtml(intro)}</p>${note ? `<p style="padding:16px;background:#f7f6f2">${escapeHtml(note)}</p>` : ""}${button(url, approved ? "Choisir un abonnement" : "Accéder à mon espace")}`,
    ),
  };
}
