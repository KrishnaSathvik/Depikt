import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import {
  avatarShuffleCandidates,
  normalizeAvatarStyle,
  type AvatarCandidate,
  type AvatarStyle,
} from "@/lib/profile/avatar";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * The DiceBear candidate grid + shuffle/save -- the AccountHub's
 * "avatar-picker" view body. No Dialog of its own; the hub shell supplies
 * the chrome. Calls `onDone` after a successful save to pop back to home.
 */
export function AvatarPickerBody({
  userId,
  currentSeed,
  currentStyle,
  onSave,
  onDone,
}: {
  userId: string;
  currentSeed: string;
  currentStyle: string;
  onSave: (input: { seed: string; style: AvatarStyle }) => Promise<void>;
  onDone: () => void;
}) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<AvatarCandidate>({
    seed: currentSeed,
    style: normalizeAvatarStyle(currentStyle),
  });
  const [saving, setSaving] = useState(false);

  // Round 0 always includes the account's current (seed, style) so "shuffle
  // away, then come back" is possible. No style filter -- every candidate
  // (including the anchor) is just one of the 8 tiles, styles mixed freely.
  const candidates = useMemo(() => {
    const shuffled = avatarShuffleCandidates(userId, round, 8);
    if (round === 0) {
      const anchor: AvatarCandidate = {
        seed: currentSeed,
        style: normalizeAvatarStyle(currentStyle),
      };
      return [anchor, ...shuffled.filter((c) => c.seed !== anchor.seed)].slice(0, 8);
    }
    return shuffled;
  }, [userId, round, currentSeed, currentStyle]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(selected);
      trackEvent("avatar_changed", {});
      onDone();
    } catch {
      toast.error("Could not save your avatar. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p className="text-body-sm text-[color:var(--text-secondary)]">
        Pick one, or shuffle for a new set.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {candidates.map((c) => (
          <button
            key={c.seed}
            type="button"
            onClick={() => setSelected(c)}
            aria-pressed={selected.seed === c.seed}
            className={cn(
              "flex items-center justify-center rounded-lg border p-2 transition-colors",
              selected.seed === c.seed
                ? "border-[color:var(--text-primary)]"
                : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]",
            )}
          >
            <DepiktAvatar seed={c.seed} style={c.style} size={44} />
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between">
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
      </div>
    </div>
  );
}
