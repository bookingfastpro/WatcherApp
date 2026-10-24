"use client";

import { useEffect } from "react";

/**
 * Vérifie la session quand l'utilisateur revient sur l'onglet (et toutes les 5 minutes).
 * Si elle a expiré, redirige vers /connexion au lieu de laisser une page qui ne répond plus.
 */
export function SessionWatch() {
  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch("/api/session", { cache: "no-store", credentials: "same-origin" });
        if (res.ok && !(await res.json()).authenticated) {
          const next = encodeURIComponent(location.pathname + location.search);
          location.replace(`/connexion?expire=1&next=${next}`);
        }
      } catch {
        // Hors ligne : on réessaiera au prochain retour sur l'onglet.
      } finally {
        busy = false;
      }
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const timer = setInterval(check, 5 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      clearInterval(timer);
    };
  }, []);
  return null;
}
