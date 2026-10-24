"use client";

import { useEffect } from "react";

/**
 * Bloque le zoom par pincement sur mobile et tablette.
 * Safari iOS/iPadOS ignore `user-scalable=no` : on annule ses événements de geste.
 * Limité aux écrans tactiles pour ne pas toucher au zoom sur ordinateur (pincement trackpad de Safari macOS).
 */
export function ZoomLock() {
  useEffect(() => {
    if (navigator.maxTouchPoints === 0) return;
    const block = (e: Event) => e.preventDefault();
    const events = ["gesturestart", "gesturechange", "gestureend"];
    events.forEach((ev) => document.addEventListener(ev, block, { passive: false }));
    return () => events.forEach((ev) => document.removeEventListener(ev, block));
  }, []);
  return null;
}
