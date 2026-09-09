import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea — the primary workspace surface in the Builder and Critic.
 * White, hairline border that stays light on focus. No ring, no shadow.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 py-3 text-base text-[color:var(--text-primary)] shadow-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-[color:var(--text-quaternary)] focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
