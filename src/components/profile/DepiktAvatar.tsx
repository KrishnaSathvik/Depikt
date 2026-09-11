import {
  AVATAR_BACKGROUNDS,
  AVATAR_SYMBOLS,
  parseAvatarVariant,
  type AvatarSymbol,
} from "@/lib/profile/avatar";
import { cn } from "@/lib/utils";

// One <g> per symbol, drawn in a 64x64 viewBox centered on (32,32). Plain
// geometry only (circles, polygons, rects) -- no icon font, no emoji, so it
// renders identically everywhere.
function Symbol({ kind, fg }: { kind: AvatarSymbol; fg: string }) {
  const stroke = { fill: "none", stroke: fg, strokeWidth: 3.5, strokeLinecap: "round" as const };
  switch (kind) {
    case "circle":
      return <circle cx={32} cy={32} r={13} fill={fg} />;
    case "ring":
      return <circle cx={32} cy={32} r={12} {...stroke} />;
    case "diamond":
      return <polygon points="32,17 47,32 32,47 17,32" fill={fg} />;
    case "diamond-outline":
      return <polygon points="32,17 47,32 32,47 17,32" {...stroke} strokeLinejoin="round" />;
    case "square":
      return <rect x={20} y={20} width={24} height={24} rx={3} fill={fg} />;
    case "square-outline":
      return <rect x={20} y={20} width={24} height={24} rx={3} {...stroke} />;
    case "triangle":
      return <polygon points="32,16 47,44 17,44" fill={fg} strokeLinejoin="round" />;
    case "triangle-outline":
      return <polygon points="32,16 47,44 17,44" {...stroke} strokeLinejoin="round" />;
    case "hexagon":
      return <polygon points="32,15 45,22.5 45,37.5 32,45 19,37.5 19,22.5" fill={fg} />;
    case "hexagon-outline":
      return (
        <polygon
          points="32,15 45,22.5 45,37.5 32,45 19,37.5 19,22.5"
          {...stroke}
          strokeLinejoin="round"
        />
      );
    case "plus":
      return (
        <g stroke={fg} strokeWidth={5} strokeLinecap="round">
          <line x1={32} y1={18} x2={32} y2={46} />
          <line x1={18} y1={32} x2={46} y2={32} />
        </g>
      );
    case "asterisk":
      return (
        <g stroke={fg} strokeWidth={4} strokeLinecap="round">
          <line x1={32} y1={18} x2={32} y2={46} />
          <line x1={20} y1={24} x2={44} y2={40} />
          <line x1={44} y1={24} x2={20} y2={40} />
        </g>
      );
    case "chevron-up":
      return <polyline points="18,38 32,22 46,38" {...stroke} strokeLinejoin="round" />;
    case "chevron-down":
      return <polyline points="18,26 32,42 46,26" {...stroke} strokeLinejoin="round" />;
    case "arc":
      return <path d="M 16 40 A 20 20 0 0 1 48 40" {...stroke} />;
    case "half-circle":
      return <path d="M 18 32 A 14 14 0 0 1 46 32 Z" fill={fg} />;
    case "dot-grid":
      return (
        <g fill={fg}>
          {[20, 32, 44]
            .flatMap((cx) => [20, 32, 44].map((cy) => ({ cx, cy })))
            .filter(({ cx, cy }) => !(cx === 32 && cy === 32))
            .map(({ cx, cy }) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} />
            ))}
        </g>
      );
    case "bars":
      return (
        <g fill={fg}>
          <rect x={19} y={24} width={6} height={20} rx={2} />
          <rect x={29} y={16} width={6} height={28} rx={2} />
          <rect x={39} y={28} width={6} height={16} rx={2} />
        </g>
      );
    case "cross":
      return (
        <g stroke={fg} strokeWidth={5} strokeLinecap="round">
          <line x1={21} y1={21} x2={43} y2={43} />
          <line x1={43} y1={21} x2={21} y2={43} />
        </g>
      );
    case "teardrop":
      return (
        <path d="M32 16 C40 26 46 33 46 39 A14 14 0 1 1 18 39 C18 33 24 26 32 16 Z" fill={fg} />
      );
    case "lens":
      return <path d="M32 18 C42 24 42 40 32 46 C22 40 22 24 32 18 Z" fill={fg} />;
    case "star4": {
      const pts = "32,14 37,27 50,32 37,37 32,50 27,37 14,32 27,27";
      return <polygon points={pts} fill={fg} />;
    }
    case "star6": {
      const pts = "32,14 36,24 47,24 39,31 42,42 32,35 22,42 25,31 17,24 28,24";
      return <polygon points={pts} fill={fg} />;
    }
    case "staircase":
      return (
        <g fill={fg}>
          <rect x={17} y={38} width={10} height={9} />
          <rect x={27} y={28} width={10} height={19} />
          <rect x={37} y={18} width={10} height={29} />
        </g>
      );
    default:
      return <circle cx={32} cy={32} r={13} fill={fg} />;
  }
}

export interface DepiktAvatarProps {
  /** avatar_variant, e.g. "s7-b3-c1". Malformed/missing falls back to the first symbol/background/composition. */
  variant: string | null | undefined;
  size?: number;
  className?: string;
  /** For screen readers / hover; the avatar itself carries no identity text. */
  label?: string;
}

/**
 * Renders a stored avatar_variant. Purely presentational -- all the
 * derivation logic (default-from-user-id, shuffle candidates, parsing)
 * lives in src/lib/profile/avatar.ts so it's testable without React.
 */
export function DepiktAvatar({ variant, size = 28, className, label }: DepiktAvatarProps) {
  const { symbolIndex, bgIndex, compositionIndex } = parseAvatarVariant(variant);
  const symbol = AVATAR_SYMBOLS[symbolIndex];
  const { bg, fg } = AVATAR_BACKGROUNDS[bgIndex];
  // composition 0: centered. 1: slight rotation. 2: scaled down with a thin ring accent.
  const transform =
    compositionIndex === 1
      ? "rotate(12 32 32)"
      : compositionIndex === 2
        ? "scale(0.86) translate(5.2 5.2)"
        : undefined;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? "Avatar"}
      className={cn("block shrink-0 rounded-full", className)}
    >
      <circle cx={32} cy={32} r={32} fill={bg} />
      {compositionIndex === 2 && (
        <circle
          cx={32}
          cy={32}
          r={23}
          fill="none"
          stroke={fg}
          strokeOpacity={0.35}
          strokeWidth={1.5}
        />
      )}
      <g transform={transform}>
        <Symbol kind={symbol} fg={fg} />
      </g>
    </svg>
  );
}
