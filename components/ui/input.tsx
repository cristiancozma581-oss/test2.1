import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Câmpurile de formular (§69).
 *
 * `aria-invalid` este stilizat, nu doar acceptat: eroarea trebuie să se vadă și
 * fără culoare (chenar mai gros) și să fie anunțată de cititoarele de ecran.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-surface px-3.5 py-2 text-[15px]",
      "placeholder:text-muted-foreground/70 transition-colors",
      "focus-visible:border-primary focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-60",
      "aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full rounded-lg border border-input bg-surface px-3.5 py-2.5 text-[15px]",
      "placeholder:text-muted-foreground/70 transition-colors",
      "focus-visible:border-primary focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-60",
      "aria-[invalid=true]:border-2 aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-lg border border-input bg-surface px-3 text-[15px]",
      "focus-visible:border-primary focus-visible:outline-none",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";

export function Label({
  className,
  obligatoriu,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { obligatoriu?: boolean }) {
  return (
    <label className={cn("block text-sm font-semibold mb-1.5", className)} {...props}>
      {props.children}
      {obligatoriu ? (
        <span className="text-destructive ml-0.5" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

/**
 * Un câmp complet: etichetă, control, indiciu și eroare, legate între ele.
 *
 * `aria-describedby` leagă mesajul de eroare de câmp, iar `role="alert"` îl
 * face să fie citit imediat. Un mesaj roșu pe care cititorul de ecran nu-l
 * anunță este, pentru cine îl folosește, un mesaj inexistent.
 */
export function Camp({
  id,
  eticheta,
  indiciu,
  eroare,
  obligatoriu,
  children,
}: {
  id: string;
  eticheta: string;
  indiciu?: string;
  eroare?: string;
  obligatoriu?: boolean;
  children: React.ReactNode;
}) {
  const idIndiciu = indiciu ? `${id}-indiciu` : undefined;
  const idEroare = eroare ? `${id}-eroare` : undefined;

  return (
    <div>
      <Label htmlFor={id} obligatoriu={obligatoriu}>
        {eticheta}
      </Label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-invalid": eroare ? true : undefined,
            "aria-describedby": [idIndiciu, idEroare].filter(Boolean).join(" ") || undefined,
          })
        : children}
      {indiciu && !eroare ? (
        <p id={idIndiciu} className="mt-1.5 text-xs text-muted-foreground">
          {indiciu}
        </p>
      ) : null}
      {eroare ? (
        <p id={idEroare} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {eroare}
        </p>
      ) : null}
    </div>
  );
}
