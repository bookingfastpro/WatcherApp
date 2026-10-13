import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Lit un paramètre de recherche Next (string | string[] | undefined) comme string. */
export function param(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function pageParam(value: string | string[] | undefined): number {
  const n = Number.parseInt(param(value) ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}
