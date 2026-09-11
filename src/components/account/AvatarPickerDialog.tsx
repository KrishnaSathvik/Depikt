import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import { avatarShuffleCandidates, deriveDefaultAvatarVariant } from "@/lib/profile/avatar";
import { trackEvent } from "@/lib/analytics";

export function AvatarPickerDialog({
  open,
  onOpenChange,
  userId,
  currentVariant,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentVariant: string;
  onSave: (variant: string) => Promise<void>;
}) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState(currentVariant);
  const [saving, setSaving] = useState(false);

  // The default (round 0) always includes the account's original
  // deterministic avatar so "shuffle away, then come back" is possible.
  const candidates = useMemo(() => {
    const shuffled = avatarShuffleCandidates(userId, round, 8);
    if (round === 0) {
      const defaultVariant = deriveDefaultAvatarVariant(userId);
      return [defaultVariant, ...shuffled.filter((v) => v !== defaultVariant)].slice(0, 8);
    }
    return shuffled;
  }, [userId, round]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(selected);
      trackEvent("avatar_changed", {});
      onOpenChange(false);
    } catch {
      toast.error("Could not save your avatar. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-[400px]">
        <DialogTitle className="text-heading-sm">Choose your avatar</DialogTitle>
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {candidates.map((variant) => (
            <button
              key={variant}
              type="button"
              onClick={() => setSelected(variant)}
              aria-pressed={selected === variant}
              className={`flex items-center justify-center rounded-lg border p-2 transition-colors ${
                selected === variant
                  ? "border-[color:var(--text-primary)]"
                  : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]"
              }`}
            >
              <DepiktAvatar variant={variant} size={44} />
            </button>
          ))}
        </div>
        <DialogFooter className="mt-5 flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRound((r) => r + 1)}
            disabled={saving}
          >
            Shuffle
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
