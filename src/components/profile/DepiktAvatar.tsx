import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";
import * as notionists from "@dicebear/notionists";
import * as thumbs from "@dicebear/thumbs";
import { normalizeAvatarStyle, type AvatarStyle } from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

const STYLE_MODULES: Record<AvatarStyle, Parameters<typeof createAvatar>[0]> = {
  lorelei,
  notionists,
  thumbs,
};

export interface DepiktAvatarProps {
  /** avatar_seed. Falls back to a fixed placeholder seed if missing/loading. */
  seed: string | null | undefined;
  /** avatar_variant (the DiceBear style id). Malformed/missing falls back to the default style. */
  style: string | null | undefined;
  size?: number;
  className?: string;
  /** For screen readers / hover; the avatar itself carries no identity text. */
  label?: string;
}

/**
 * Renders a stored (seed, style) pair via DiceBear, generated locally --
 * never a request to DiceBear's HTTP API. All the derivation logic
 * (default-from-user-id, shuffle seeds, style validation) lives in
 * src/lib/profile/avatar.ts so it's testable without React.
 */
export function DepiktAvatar({ seed, style, size = 28, className, label }: DepiktAvatarProps) {
  const resolvedStyle = normalizeAvatarStyle(style);
  const resolvedSeed = seed && seed.length > 0 ? seed : "depikt";

  const dataUri = useMemo(
    () => createAvatar(STYLE_MODULES[resolvedStyle], { seed: resolvedSeed, size: 64 }).toDataUri(),
    [resolvedStyle, resolvedSeed],
  );

  return (
    <img
      src={dataUri}
      alt=""
      role="img"
      aria-label={label ?? "Avatar"}
      width={size}
      height={size}
      className={cn("block shrink-0 rounded-full bg-[color:var(--bg-subtle)]", className)}
    />
  );
}
