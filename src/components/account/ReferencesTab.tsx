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
        <h2 className="text-heading-sm">{C.title}</h2>
        {entities.length === 0 && !loading && (
          <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">{C.empty}</p>
        )}
        {entities.length > 0 && (
          <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">{C.lockedHint}</p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-body-sm text-red-600">
          {error}
        </p>
      )}
      {loading && <p>{C.loading}</p>}
      {choosingType ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-heading-sm">Create a saved reference</h3>
          <p className="text-body-sm text-[color:var(--text-secondary)]">
            What are you keeping consistent?
          </p>
          <div className="flex flex-wrap gap-2">
            {(["character", "product", "brand"] as const).map((choice) => (
              <Button
                key={choice}
                variant="outline"
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
          <Button variant="ghost" onClick={() => setChoosingType(false)}>
            Cancel
          </Button>
        </div>
      ) : editing === null ? (
        <Button
          variant="outline"
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
          className="space-y-3 rounded-lg border p-4"
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
          <label className="block text-body-sm">
            {C.name}
            <Input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {editing === "new" && (
            <label className="block text-body-sm">
              {C.type}
              <select
                className="ml-3 rounded border p-2"
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
          <label className="block text-body-sm">
            {C.description}
            <Textarea
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={C.hints[type]}
            />
          </label>
          <div className="flex gap-2">
            <Button disabled={busy}>{C.save}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              {C.cancel}
            </Button>
          </div>
        </form>
      )}
      {(Object.keys(C.groups) as EntityType[])
        .filter((group) => entities.some((entity) => entity.type === group))
        .map((group) => (
          <div key={group} className="space-y-3">
            <h3 className="text-body-sm font-medium">{C.groups[group]}</h3>
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
    <article className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="font-medium underline-offset-4 hover:underline"
          onClick={edit}
        >
          {e.name}
        </button>
        <span className="text-body-sm text-[color:var(--text-secondary)]">
          {C.imageBudget(e.assets.length, 8)}
        </span>
        <Button
          variant="ghost"
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
              className="h-24 w-24 rounded border object-cover"
            />
            <p className="mt-1 text-xs">{C.roles[a.role] ?? a.role.replaceAll("_", " ")}</p>
            <button
              type="button"
              disabled={busy}
              className="text-xs underline"
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
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-body-sm">
            {C.role}
            <select
              aria-label={`${C.role} for ${e.name}`}
              className="ml-2 rounded border p-2"
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
          <label className="cursor-pointer rounded border px-3 py-2 text-body-sm">
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
