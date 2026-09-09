import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button — design system rules:
 *  - default (primary): ink on white text, rounded-md (6px), 150ms ease-out
 *  - secondary: white card, default border, primary text
 *  - outline: transparent, default border, primary text
 *  - ghost: transparent, secondary text, hover bg-subtle
 *  - destructive: red bg
 *  - link: underlined accent text
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--accent)] text-[color:var(--accent-text)] hover:bg-[color:var(--accent-hover)]",
        destructive: "bg-[color:var(--error)] text-white hover:opacity-90",
        outline:
          "border border-[color:var(--border-default)] bg-transparent text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)]",
        secondary:
          "border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)]",
        ghost:
          "bg-transparent text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] hover:text-[color:var(--text-primary)]",
        link: "text-[color:var(--text-primary)] underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-[13px]",
        lg: "h-12 rounded-md px-6 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
