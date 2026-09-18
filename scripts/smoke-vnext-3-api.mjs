// Explicit hosted smoke through the local application routes. Cleans up its own packs.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
process.loadEnvFile(".env.local");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await db.auth.signInWithPassword({
  email: process.env.VITE_DEV_AUTH_EMAIL,
  password: process.env.VITE_DEV_AUTH_PASSWORD,
});
if (error || !data.session) throw new Error("Test account authentication failed");
const checks = [];
const created = [];
const base = "http://127.0.0.1:8080/api/generation/entities";
async function api(path = "", method = "GET", body, expected = 200) {
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status !== expected)
    throw new Error(`${method} entity route: expected ${expected}, got ${res.status}`);
  return res.json();
}
function check(label, ok) {
  if (!ok) throw new Error(label);
  checks.push({ label, result: "PASS" });
  console.log(`PASS: ${label}`);
}
function image(pack, file) {
  return (
    "data:image/webp;base64," +
    readFileSync(`tests/image-evals/vnext-3/fixtures/${pack}/${file}.webp`).toString("base64")
  );
}
try {
  for (const [type, pack, primary, extra, extraFile] of [
    ["character", "character-a", "primary", "three_quarter", "three-quarter"],
    ["product", "product-a", "primary", "detail", "detail"],
    ["brand", "brand-a", "logo", "style_reference", "style-reference"],
  ]) {
    const name = `API smoke ${type} ${randomUUID().slice(0, 8)}`;
    const { id } = await api("", "POST", { name, type }, 201);
    created.push(id);
    const primaryFile = type === "product" ? "front" : primary;
    await api(`/${id}/assets`, "POST", { role: primary, dataUrl: image(pack, primaryFile) }, 201);
    const { id: assetId } = await api(
      `/${id}/assets`,
      "POST",
      { role: extra, dataUrl: image(pack, extraFile) },
      201,
    );
    await api(`/${id}`, "PATCH", {
      name: name + " renamed",
      description: "Temporary route validation",
    });
    const { entities } = await api();
    const entity = entities.find((e) => e.id === id);
    check(
      `${type}: create, uploads, rename, description, signed previews`,
      entity?.assets.length === 2 &&
        entity.name.endsWith("renamed") &&
        entity.description === "Temporary route validation" &&
        entity.assets.every((a) => a.previewUrl),
    );
    await api(`/${id}/assets/${assetId}`, "DELETE");
    await api(`/${id}/assets`, "POST", { role: extra, dataUrl: image(pack, extraFile) }, 201);
    check(`${type}: delete and re-add secondary asset`, true);
  }
} finally {
  for (const id of created) await api(`/${id}`, "DELETE");
  const { entities } = await api();
  check("all route smoke packs cleaned up", !entities.some((e) => created.includes(e.id)));
  writeFileSync(
    "benchmark-results/vnext-3-api-smoke.json",
    JSON.stringify({ at: new Date().toISOString(), checks }, null, 2),
  );
  await db.auth.signOut();
}
