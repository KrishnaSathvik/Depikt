import { useAuth } from "@/lib/auth-context";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { REFERENCES_COPY as C } from "@/lib/product";
import {
  type ReferenceEntity,
  type EntityType,
  MAX_ATTACHED_ENTITIES,
  MAX_JOB_INPUT_IMAGES_WITH_ENTITIES,
} from "@/lib/generation/entities";
import { listReferenceEntities } from "@/lib/generation/entity-client";
import { resolveEntityReferences } from "@/lib/generation/entity-reference-resolver";
import { ReferencesTab } from "@/components/account/ReferencesTab";
export function ReferencePackPicker({
  selected,
  onChange,
  prompt,
  adhocCount,
  sourceCount = 0,
}: {
  selected: ReferenceEntity[];
  onChange: (v: ReferenceEntity[]) => void;
  prompt: string;
  adhocCount: number;
  sourceCount?: number;
}) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false),
    [manage, setManage] = useState(false),
    [entities, setEntities] = useState<ReferenceEntity[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setEntities([]);
    setError("");
    if (open && !manage && userId) {
      setLoading(true);
      listReferenceEntities()
        .then((r) => {
          if (!cancelled) setEntities(r.entities.filter((entity) => entity.user_id === userId));
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [open, manage, userId]);
  const owned = entities.filter((entity) => entity.user_id === user?.id);
  let count = adhocCount + sourceCount;
  try {
    count += resolveEntityReferences({
      entities: selected,
      prompt,
      budget: MAX_JOB_INPUT_IMAGES_WITH_ENTITIES - count,
    }).reduce((n, e) => n + e.resolvedReferences.length, 0);
  } catch {
    count += selected.length;
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {selected
          .filter((entity) => entity.user_id === user?.id)
          .map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-body-sm"
            >
              <Lock className="h-3 w-3" aria-hidden />
              <span className="flex flex-col items-start leading-tight">
                <span>{e.name}</span>
                <span className="text-[11px] text-[color:var(--text-tertiary)]">
                  {C.kinds[e.type]} · {C.locked}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${e.name}`}
                onClick={() => onChange(selected.filter((s) => s.id !== e.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {C.add}
        </Button>
        {selected.length > 0 && (
          <span className="text-xs text-[color:var(--text-secondary)]">
            {C.imageBudget(count, MAX_JOB_INPUT_IMAGES_WITH_ENTITIES)}
          </span>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogTitle>{C.add}</DialogTitle>
          <DialogDescription>{C.pickerDescription}</DialogDescription>
          {error && <p role="alert">{error}</p>}
          {!user ? (
            authLoading ? (
              <p>Loading…</p>
            ) : (
              <p className="text-body-sm">
                Sign in to create and use your saved references.{" "}
                <Link to="/sign-in" className="underline">
                  Sign in
                </Link>
              </p>
            )
          ) : manage ? (
            <>
              <Button variant="ghost" onClick={() => setManage(false)}>
                Back to saved references
              </Button>
              <ReferencesTab key={user.id} startCreating />
            </>
          ) : (
            <>
              {loading && <p className="text-body-sm">Loading saved references…</p>}
              {!loading && !error && owned.length === 0 && (
                <p className="text-body-sm text-[color:var(--text-secondary)]">
                  No reference packs yet.
                </p>
              )}
              {(Object.keys(C.groups) as EntityType[])
                .filter((type) => owned.some((entity) => entity.type === type))
                .map((type) => (
                  <div key={type} className="space-y-2">
                    <h3 className="text-body-sm font-medium">{C.groups[type]}</h3>
                    {owned
                      .filter((e) => e.type === type)
                      .map((e) => (
                        <Button
                          key={e.id}
                          variant="outline"
                          className="mr-2"
                          disabled={
                            !e.assets.length ||
                            selected.some((s) => s.id === e.id) ||
                            selected.length >= MAX_ATTACHED_ENTITIES ||
                            selected.length + adhocCount + sourceCount >= 8
                          }
                          onClick={() => {
                            onChange([...selected, e]);
                            setOpen(false);
                          }}
                        >
                          {e.name}
                          <Lock className="ml-2 h-3 w-3" />
                        </Button>
                      ))}
                  </div>
                ))}
              <Button variant="outline" onClick={() => setManage(true)}>
                {C.create}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
