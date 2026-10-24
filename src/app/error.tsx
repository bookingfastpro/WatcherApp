"use client";

import { useEffect } from "react";
import { LogoImage } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white lg:bg-ivory px-6 text-center">
      <LogoImage onLight className="h-8" />
      <h1 className="mt-10 font-display text-5xl text-ink">Une erreur est survenue</h1>
      <p className="mt-4 max-w-md text-slate">
        L'opération n'a pas pu aboutir. Réessayez dans un instant ; si le problème persiste, contactez-nous
        {error.digest ? ` en indiquant la référence ${error.digest}` : ""}.
      </p>
      <Button onClick={reset} className="mt-10">
        Réessayer
      </Button>
    </main>
  );
}
