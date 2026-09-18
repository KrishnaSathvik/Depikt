import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REFERENCES_COPY as C } from "@/lib/product";
import { ROLES_BY_TYPE, type ReferenceEntity, type EntityType } from "@/lib/generation/entities";
import { entityRequest, listReferenceEntities } from "@/lib/generation/entity-client";
import { fileToReferenceState } from "@/lib/reference-image";
import { trackEvent } from "@/lib/analytics";
export function ReferencesTab() {
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
      setEntities((await listReferenceEntities()).entities);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
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
        <p className="mt-1 text-body-sm text-[color:var(--text-secondary)]">{C.empty}</p>
      </div>
      {error && (
        <p role="alert" className="text-body-sm text-red-600">
          {error}
        </p>
      )}
      {loading && <p>{C.loading}</p>}
      {editing === null ? (
        <Button
          variant="outline"
          onClick={() => {
            setEditing("new");
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
      {(Object.keys(C.groups) as EntityType[]).map((group) => (
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
        <span className="text-body-sm text-[color:var(--text-secondary)]">{e.assets.length}/8</span>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              await entityRequest(`/${e.id}`, "DELETE");
            })
          }
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
            <img
              src={a.previewUrl ?? ""}
              alt={`${e.name}, ${a.role.replaceAll("_", " ")}`}
              className="h-24 w-24 rounded border object-cover"
            />
            <p className="mt-1 text-xs">{a.role.replaceAll("_", " ")}</p>
            <button
              type="button"
              disabled={busy}
              className="text-xs underline"
              aria-label={`Remove ${a.role} of ${e.name}`}
              onClick={() =>
                void action(async () => {
                  await entityRequest(`/${e.id}/assets/${a.id}`, "DELETE");
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
                  {r.replaceAll("_", " ")}
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
    </article>
  );
}
