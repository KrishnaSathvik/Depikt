import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { REFERENCE_INTENT_OPTIONS, prefersLossless } from "@/lib/prompt-engine/reference";
import {
  fileToReferenceState,
  MAX_UPLOAD_BYTES,
  type ReferenceImageState,
  type ReferenceIntentChoice,
} from "@/lib/reference-image";

export type { ReferenceImageState, ReferenceIntentChoice };
export { fileToReferenceState, MAX_UPLOAD_BYTES };

interface Props {
  value: ReferenceImageState | null;
  onChange: (next: ReferenceImageState | null) => void;
  /** Label shown on the add button. */
  addLabel?: string;
  /** Extra content rendered next to the intent selector (optional). */
  children?: ReactNode;
}

/**
 * Upload / paste / drop a reference image, choose how it should be used.
 * Re-encodes the image when the chosen intent prefers lossless output.
 */
export function ReferenceImagePicker({
  value,
  onChange,
  addLabel = "Add reference image",
  children,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image too large (max 10MB)");
      return;
    }
    setLoading(true);
    try {
      onChange(await fileToReferenceState(file, value?.intent ?? "auto"));
    } catch {
      toast.error("Failed to process image");
    } finally {
      setLoading(false);
    }
  };

  const handleIntent = async (intent: ReferenceIntentChoice) => {
    if (!value) return;
    const needsReencode = value.file && prefersLossless(intent) !== prefersLossless(value.intent);
    if (!needsReencode) {
      onChange({ ...value, intent });
      return;
    }
    setLoading(true);
    try {
      onChange(await fileToReferenceState(value.file!, intent));
    } catch {
      onChange({ ...value, intent });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-mono-sm text-[color:var(--text-tertiary)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Processing image…
      </div>
    );
  }

  if (value) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] px-2.5 py-1.5">
          <img
            src={value.dataUrl}
            alt="Reference image thumbnail"
            className="h-8 w-8 rounded object-cover"
          />
          <span className="text-[12px] font-mono text-[color:var(--text-secondary)]">
            Reference image
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-1 rounded p-0.5 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-elevated)] transition-colors"
            aria-label="Remove reference image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] font-mono text-[color:var(--text-tertiary)]">
          Use reference as
          <select
            value={value.intent}
            onChange={(e) => handleIntent(e.target.value as ReferenceIntentChoice)}
            aria-label="Reference image intent"
            className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-2 py-1 text-[12px] font-mono text-[color:var(--text-primary)]"
          >
            {REFERENCE_INTENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {children}
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-mono text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-subtle)] border border-dashed border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)] transition-colors"
      >
        <ImagePlus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </>
  );
}
