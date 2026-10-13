"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-none !border !border-line !bg-paper !text-anthracite !shadow-[var(--shadow-float)] !font-sans",
          description: "!text-slate",
          error: "!border-alert/30",
          success: "!border-ok/30",
        },
      }}
    />
  );
}
