/**
 * Quiet Imago paste hint under Open-in-Imago — desktop kbd vs mobile long-press.
 */
export function ImagoPasteHint() {
  return (
    <p className="text-[13px] text-[color:var(--text-tertiary)]">
      <span className="hidden sm:inline">
        Opens Imago with your prompt copied. Paste with{" "}
        <kbd className="rounded border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-1 py-0.5 font-mono text-[10px]">
          {typeof navigator !== "undefined" &&
          navigator.platform?.toUpperCase().includes("MAC")
            ? "⌘V"
            : "Ctrl+V"}
        </kbd>
      </span>
      <span className="sm:hidden">
        Opens Imago with your prompt copied. Long-press the text field and tap Paste.
      </span>
    </p>
  );
}
