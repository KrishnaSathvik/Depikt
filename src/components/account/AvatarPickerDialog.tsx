import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { DepiktAvatar } from "@/components/profile/DepiktAvatar";
import {
  AVATAR_STYLES,
  avatarShuffleSeeds,
  deriveDefaultAvatarSeed,
  normalizeAvatarStyle,
  type AvatarStyle,
} from "@/lib/profile/avatar";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const STYLE_LABEL: Record<AvatarStyle, string> = {
  lorelei: "Lorelei",
  notionists: "Notionists",
  thumbs: "Thumbs",
};

export function AvatarPickerDialog({
  open,
  onOpenChange,
  userId,
  currentSeed,
  currentStyle,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentSeed: string;
  currentStyle: string;
  onSave: (input: { seed: string; style: AvatarStyle }) => Promise<void>;
}) {
  const [style, setStyle] = useState<AvatarStyle>(normalizeAvatarStyle(currentStyle));
  const [round, setRound] = useState(0);
  const [selectedSeed, setSelectedSeed] = useState(currentSeed);
  const [saving, setSaving] = useState(false);

  // Round 0 always includes the account's current seed for this style (or
  // the plain default) so "shuffle away, then come back" is possible.
  const seeds = useMemo(() => {
    const shuffled = avatarShuffleSeeds(userId, round, 8);
    if (round === 0) {
      const anchor =
        style === normalizeAvatarStyle(currentStyle)
          ? currentSeed
          : deriveDefaultAvatarSeed(userId);
      return [anchor, ...shuffled.filter((s) => s !== anchor)].slice(0, 8);
    }
    return shuffled;
  }, [userId, round, style, currentSeed, currentStyle]);

  function pickStyle(next: AvatarStyle) {
    if (next === style) return;
    setStyle(next);
    setRound(0);
    setSelectedSeed(
      next === normalizeAvatarStyle(currentStyle) ? currentSeed : deriveDefaultAvatarSeed(userId),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ seed: selectedSeed, style });
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

        <div className="mt-3 flex gap-1.5">
          {AVATAR_STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pickStyle(s)}
              aria-pressed={style === s}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                style === s
                  ? "border-[color:var(--text-primary)] bg-[color:var(--text-primary)] text-[color:var(--bg)]"
                  : "border-[color:var(--border-default)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]",
              )}
            >
              {STYLE_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {seeds.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => setSelectedSeed(seed)}
              aria-pressed={selectedSeed === seed}
              className={cn(
                "flex items-center justify-center rounded-lg border p-2 transition-colors",
                selectedSeed === seed
                  ? "border-[color:var(--text-primary)]"
                  : "border-[color:var(--border-subtle)] hover:border-[color:var(--border-default)]",
              )}
            >
              <DepiktAvatar seed={seed} style={style} size={44} />
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
