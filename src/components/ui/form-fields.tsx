import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldErrorText } from "./form-context";

const control =
  "w-full border border-line-strong bg-paper px-3.5 text-[15px] text-anthracite placeholder:text-smoke/80 transition-colors duration-150 hover:border-slate focus:border-ink focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-alert disabled:bg-mist disabled:text-smoke";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(control, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate" aria-hidden />
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Libellé + contrôle + aide + erreur serveur (lue depuis le contexte du formulaire). */
export function Field({ label, name, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-[13px] font-medium text-graphite">
        {label}
        {required ? <span className="ml-0.5 text-alert" aria-hidden> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-[12.5px] leading-snug text-smoke">{hint}</p> : null}
      <FieldErrorText name={name} />
    </div>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
  required,
  children,
}: {
  name: string;
  label?: React.ReactNode;
  defaultChecked?: boolean;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-graphite">
        <input
          type="checkbox"
          name={name}
          id={name}
          defaultChecked={defaultChecked}
          required={required}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-ink"
        />
        <span>{label ?? children}</span>
      </label>
      <FieldErrorText name={name} />
    </div>
  );
}

export function Fieldset({ legend, description, children, className }: {
  legend: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("grid gap-5", className)}>
      <div className="mb-1">
        <legend className="font-display text-2xl text-ink">{legend}</legend>
        {description ? <p className="mt-1 text-sm text-slate">{description}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
