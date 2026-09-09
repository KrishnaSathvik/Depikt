import { REFERENCE_REATTACH_NOTE } from "@/lib/product";

/**
 * Depikt copies the prompt into Imago but cannot move the reference image
 * into that separate ChatGPT session. Shown only when the prompt actually
 * depends on an attached reference (see needsReferenceReattach).
 */
export function ReferenceReattachNote({ thumb }: { thumb: string }) {
  return (
    <div
      role="note"
      className="flex items-center gap-3 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-subtle)] px-3 py-2 text-[12px] leading-snug text-[color:var(--text-secondary)]"
    >
      <img
        src={thumb}
        alt="Your reference image"
        className="h-9 w-9 shrink-0 rounded object-cover border border-[color:var(--border-subtle)]"
      />
      <span className="min-w-0 flex-1">{REFERENCE_REATTACH_NOTE}</span>
      <a
        href={thumb}
        download="depikt-reference"
        className="shrink-0 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-2 py-1 font-mono text-[11px] text-[color:var(--text-primary)] hover:bg-[color:var(--bg)] transition-colors"
      >
        Save image
      </a>
    </div>
  );
}
