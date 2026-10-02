import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const butonVariante = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
        accent: "bg-accent text-accent-foreground hover:opacity-90 shadow-sm",
        outline:
          "border border-border bg-surface hover:bg-surface-muted text-foreground",
        ghost: "hover:bg-surface-muted text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        link: "text-primary underline underline-offset-4 hover:opacity-80",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof butonVariante> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(butonVariante({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { butonVariante };
