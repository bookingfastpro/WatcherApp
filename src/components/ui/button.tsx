import Link from "next/link";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "light" | "outline-light";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium tracking-[0.02em] transition-colors duration-200 ease-[var(--ease-soft)] disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-ivory hover:bg-graphite",
  secondary: "border border-line-strong bg-paper text-anthracite hover:border-anthracite",
  ghost: "text-slate hover:text-ink hover:bg-mist",
  danger: "bg-alert text-ivory hover:bg-[#74231c]",
  light: "bg-ivory text-ink hover:bg-white",
  "outline-light": "border border-white/25 text-ivory hover:border-white/60",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
