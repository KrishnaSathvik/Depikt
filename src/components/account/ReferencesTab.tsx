import { RecoverableImage } from "@/components/RecoverableImage";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { privateScope, isCurrentPrivateScope } from "@/lib/private-cache";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REFERENCES_COPY as C } from "@/lib/product";
import { ROLES_BY_TYPE, type ReferenceEntity, type EntityType } from "@/lib/generation/entities";
import { entityRequest, listReferenceEntities } from "@/lib/generation/entity-client";
import { fileToReferenceState } from "@/lib/reference-image";
import { trackEvent } from "@/lib/analytics";
export function ReferencesTab({ startCreating = false }: { startCreating?: boolean }) {
  const { user } = useAuth();
  return user ? (
    <OwnedReferencesTab
      key={`${user.id}:${privateScope(user.id).epoch}`}
      startCreating={startCreating}
      userId={user.id}
    />
  ) : (
    <p>{C.signIn}</p>
  );
}
function OwnedReferencesTab({ startCreating, userId }: { startCreating: boolean; userId: string }) {
  const [scope] = useState(() => privateScope(userId));
  const [choosingType, setChoosingType] = useState(startCreating);
  const [entities, setEntities] = useState<ReferenceEntity[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [type, setType] = useState<EntityType>("character");
  const load = useCallback(async () => {
    try {
      const result = await listReferenceEntities();
      if (!isCurrentPrivateScope(scope)) return;
      setEntities(result.entities);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [scope]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5" aria-label={C.title}>
      <div>
        <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-[32px]">
          {C.title}
        </h2>
        {entities.length === 0 && !loading && (
          <p className="mt-1.5 text-[15px] text-[color:var(--text-secondary)]">{C.empty}</p>
        )}
        {entities.length > 0 && (
          <p className="mt-1.5 text-[15px] text-[color:var(--text-secondary)]">{C.lockedHint}</p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-body-sm text-red-600">
          {error}
        </p>
      )}
      {loading && <p className="text-body-sm text-[color:var(--text-tertiary)]">{C.loading}</p>}
      {choosingType ? (
        <div className="surface-card space-y-4 p-5 sm:p-6">
          <h3 className="text-[18px] font-semibold tracking-[-0.015em]">
            Create a saved reference
          </h3>
          <p className="text-body-sm text-[color:var(--text-secondary)]">
            What are you keeping consistent?
          </p>
          <div className="flex flex-wrap gap-2">
            {(["character", "product", "brand"] as const).map((choice) => (
              <Button
                key={choice}
                variant="outline"
                className="h-11 sm:h-10"
                onClick={() => {
                  setType(choice);
                  setName("");
                  setDescription("");
                  setEditing("new");
                  setChoosingType(false);
                }}
              >
                {choice[0].toUpperCase() + choice.slice(1)}
              </Button>
            ))}
          </div>
          <Button variant="ghost" className="h-11 sm:h-10" onClick={() => setChoosingType(false)}>
            Cancel
          </Button>
        </div>
      ) : editing === null ? (
        <Button
          className="h-11 sm:h-10"
          onClick={() => {
            setChoosingType(true);
            setName("");
            setDescription("");
            setType("character");
          }}
        >
          {C.create}
        </Button>
      ) : (
        <form
          className="surface-card space-y-4 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await entityRequest(
                editing === "new" ? "" : `/${editing}`,
                editing === "new" ? "POST" : "PATCH",
                { name, description, ...(editing === "new" ? { type } : {}) },
              );
              if (editing === "new") trackEvent("reference_pack_created", { type });
              setEditing(null);
            });
          }}
        >
          <label className="block space-y-1.5 text-body-sm font-medium">
            <span>{C.name}</span>
            <Input
              className="h-11 rounded-xl"
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          {editing === "new" && (
            <label className="block text-body-sm font-medium">
              {C.type}
              <select
                className="ml-3 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 text-[14px] h-11 sm:h-10"
                value={type}
                onChange={(e) => setType(e.target.value as EntityType)}
              >
                {Object.entries(C.groups).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1.5 text-body-sm font-medium">
            <span>{C.description}</span>
            <Textarea
              className="rounded-xl"
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={C.hints[type]}
            />
          </label>
          <div className="flex gap-2">
            <Button className="h-11 sm:h-10" disabled={busy}>
              {C.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 sm:h-10"
              onClick={() => setEditing(null)}
            >
              {C.cancel}
            </Button>
          </div>
        </form>
      )}
      {(Object.keys(C.groups) as EntityType[])
        .filter((group) => entities.some((entity) => entity.type === group))
        .map((group) => (
          <div key={group} className="space-y-3 pt-2">
            <h3 className="text-[13px] font-medium uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]">
              {C.groups[group]}
            </h3>
            {entities
              .filter((e) => e.type === group)
              .map((entity) => (
                <PackCard
                  key={entity.id}
                  entity={entity}
                  busy={busy}
                  action={action}
                  edit={() => {
                    setEditing(entity.id);
                    setName(entity.name);
                    setDescription(entity.description);
                    setType(entity.type);
                  }}
                />
              ))}
          </div>
        ))}
    </section>
  );
}
function PackCard({
  entity: e,
  busy,
  action,
  edit,
}: {
  entity: ReferenceEntity;
  busy: boolean;
  action: (fn: () => Promise<void>) => Promise<void>;
  edit: () => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<{ path: string; label: string } | null>(null);
  const [role, setRole] = useState<string>(e.type === "brand" ? "logo" : "primary");
  const primary = e.type === "brand" ? "logo" : "primary";
  const roles = e.assets.length ? ROLES_BY_TYPE[e.type].filter((r) => r !== primary) : [primary];
  const selected = roles.includes(role as never) ? role : roles[0];
  return (
    <article className="surface-card space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="min-h-9 text-[17px] font-semibold tracking-[-0.015em] underline-offset-4 hover:underline"
          onClick={edit}
        >
          {e.name}
        </button>
        <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-subtle)] px-2.5 py-0.5 text-[12px] font-medium text-[color:var(--text-secondary)]">
          {C.imageBudget(e.assets.length, 8)}
        </span>
        <Button
          variant="ghost"
          className="ml-auto h-11 sm:h-9"
          disabled={busy}
          onClick={() => setPendingDelete({ path: `/${e.id}`, label: `Delete ${e.name}?` })}
        >
          {C.remove}
        </Button>
      </div>
      {e.description && (
        <p className="text-body-sm text-[color:var(--text-secondary)]">{e.description}</p>
      )}
      <div className="flex flex-wrap gap-3">
        {e.assets.map((a) => (
          <div key={a.id} className="w-24">
            <RecoverableImage
              src={a.previewUrl ?? ""}
              refreshUrl={async () =>
                (await listReferenceEntities()).entities
                  .find((entity) => entity.id === e.id)
                  ?.assets.find((asset) => asset.id === a.id)?.previewUrl
              }
              alt={`${e.name}, ${C.roles[a.role] ?? a.role.replaceAll("_", " ")}`}
              className="h-24 w-24 rounded-[14px] object-cover shadow-[0_0_0_1px_rgba(17,17,17,0.06)]"
            />
            <p className="mt-1.5 text-xs text-[color:var(--text-secondary)]">
              {C.roles[a.role] ?? a.role.replaceAll("_", " ")}
            </p>
            <button
              type="button"
              disabled={busy}
              className="min-h-8 text-xs text-[color:var(--text-tertiary)] underline underline-offset-2 hover:text-[color:var(--text-primary)]"
              aria-label={`Remove ${C.roles[a.role] ?? a.role} of ${e.name}`}
              onClick={() =>
                setPendingDelete({
                  path: `/${e.id}/assets/${a.id}`,
                  label: `Remove ${C.roles[a.role] ?? a.role} from ${e.name}?`,
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {e.assets.length < 8 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border-subtle)] pt-4">
          <label className="text-body-sm text-[color:var(--text-secondary)]">
            {C.role}
            <select
              aria-label={`${C.role} for ${e.name}`}
              className="ml-2 rounded-full border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-4 text-[14px] h-11 sm:h-10 text-[color:var(--text-primary)]"
              value={selected}
              onChange={(ev) => setRole(ev.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {C.roles[r] ?? r.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full border border-[color:var(--border-default)] px-5 text-[14px] font-medium text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-subtle)] focus-within:ring-2 focus-within:ring-[color:var(--accent)] sm:h-10">
            {C.upload}
            <input
              aria-label={`${C.upload} to ${e.name}`}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(ev) => {
                const file = ev.target.files?.[0];
                ev.target.value = "";
                if (file)
                  void action(async () => {
                    const image = await fileToReferenceState(
                      file,
                      e.type === "character"
                        ? "subject_identity"
                        : e.type === "product"
                          ? "product_object"
                          : "style",
                    );
                    await entityRequest(`/${e.id}/assets`, "POST", {
                      dataUrl: image.dataUrl,
                      role: selected,
                    });
                    trackEvent("reference_pack_asset_added", { type: e.type, role: selected });
                  });
              }}
            />
          </label>
        </div>
      )}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved reference from your account. Existing generated images are
              kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => {
                const target = pendingDelete;
                if (target)
                  void action(async () => {
                    await entityRequest(target.path, "DELETE");
                  });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
