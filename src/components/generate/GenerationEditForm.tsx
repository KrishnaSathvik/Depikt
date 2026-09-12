import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Shared edit-image form for Generate's left pane and Build/Critique inline
 * generation — same chrome, same CTA sizing.
 */
export function GenerationEditForm({
  value,
  onChange,
  onApply,
  onCancel,
}: {
  value: string;
  onChange: (next: string) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-[color:var(--border-subtle)] p-4">
      <p className="text-body-sm font-medium text-[color:var(--text-primary)]">Edit image</p>
      <p className="text-body-sm text-[color:var(--text-secondary)]">What should change?</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Make the jacket dark blue and keep everything else unchanged."
      />
      <div className="flex flex-wrap gap-2">
        <Button size="default" className="gap-2" disabled={!value.trim()} onClick={onApply}>
          Apply edit → · 1 credit
        </Button>
        <Button size="default" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
