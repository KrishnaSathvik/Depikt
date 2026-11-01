import { useEffect, useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One presentation for a large sample image: preserves aspect ratio
 * (object-contain), fits the viewport, shows a quiet loading state and a
 * plain error state (or a caller-supplied `fallback`, such as cover art). Used by the Gallery lightbox and the Library detail
 * view so both surfaces render images the same way.
 */
export function SampleImage({
  src,
  alt,
  className,
  imgClassName,
  maxHeightClass = "max-h-[60vh]",
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** Tailwind max-height for the image; the frame follows the image. */
  maxHeightClass?: string;
  /** Rendered instead of the plain "Image unavailable" state when the image fails. */
  fallback?: ReactNode;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  // Reset when the source changes (the dialog is reused between prompts).
  useEffect(() => {
    setState("loading");
  }, [src]);

  if (state === "error" && fallback) return <>{fallback}</>;

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden bg-[color:var(--bg-subtle)]",
        state === "loading" && "min-h-[240px] animate-pulse",
        className,
      )}
    >
      {state === "error" ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-[color:var(--text-tertiary)]">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--bg-elevated)] shadow-[0_1px_2px_rgba(17,17,17,0.06)]">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-body-sm">Image unavailable</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          decoding="async"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={cn(
            "w-full object-contain transition-opacity duration-200",
            maxHeightClass,
            state === "loading" ? "opacity-0" : "opacity-100",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
