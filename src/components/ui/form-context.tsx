"use client";

import { createContext, useContext } from "react";

export const FieldErrorsContext = createContext<Record<string, string[] | undefined>>({});

export function FieldErrorText({ name }: { name: string }) {
  const errors = useContext(FieldErrorsContext);
  const messages = errors[name];
  if (!messages?.length) return null;
  return (
    <p role="alert" className="text-[12.5px] text-alert">
      {messages[0]}
    </p>
  );
}
