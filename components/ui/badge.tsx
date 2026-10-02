import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const insignaVariante = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        outline: "border-border text-foreground",
        muted: "border-transparent bg-surface-muted text-muted-foreground",
        /* Regimurile de acces din §10 au fiecare culoarea lor, ca studentul să
           vadă dintr-o privire ce îl costă o resursă. */
        deschis: "border-transparent bg-success/15 text-success",
        standard: "border-transparent bg-primary/12 text-primary",
        premium: "border-transparent bg-accent/18 text-accent",
        institutional: "border-transparent bg-warning/18 text-warning",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof insignaVariante>) {
  return (
    <span className={cn(insignaVariante({ variant }), className)} {...props} />
  );
}

export { insignaVariante };
