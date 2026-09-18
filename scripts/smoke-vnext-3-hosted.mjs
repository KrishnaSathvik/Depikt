import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
process.loadEnvFile(".env.local");
const url = process.env.SUPABASE_URL;
if (new URL(url).hostname !== "cexsqtqcrbvhgzkhtgqo.supabase.co")
  throw new Error("Unexpected Supabase target");
const db = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: login, error: authError } = await db.auth.signInWithPassword({
  email: process.env.VITE_DEV_AUTH_EMAIL,
  password: process.env.VITE_DEV_AUTH_PASSWORD,
});
if (authError || !login.user) throw new Error("Development test account authentication failed");
const userId = login.user.id,
  entityId = randomUUID(),
  assetId = randomUUID();
const path = `users/${userId}/entities/${entityId}/${assetId}.webp`;
const evidence = {
  at: new Date().toISOString(),
  project: "cexsqtqcrbvhgzkhtgqo",
  checks: [],
  cleanup: false,
};
const check = (label, condition) => {
  if (!condition) throw new Error(label);
  evidence.checks.push({ label, result: "PASS" });
  console.log(`PASS: ${label}`);
};
let created = false;
try {
  const createdResult = await db
    .from("reference_entities")
    .insert({
      id: entityId,
      user_id: userId,
      name: `VNext 3 smoke ${entityId.slice(0, 8)}`,
      type: "character",
    })
    .select("id")
    .single();
  check(
    "authenticated owner creates own entity",
    !createdResult.error && createdResult.data?.id === entityId,
  );
  created = true;
  const bytes = readFileSync("tests/image-evals/vnext-3/fixtures/character-a/primary.webp");
  const uploaded = await db.storage
    .from("generation-assets")
    .upload(path, bytes, { contentType: "image/webp", upsert: false });
  check("authenticated private asset upload", !uploaded.error);
  const asset = await db
    .from("reference_entity_assets")
    .insert({
      id: assetId,
      entity_id: entityId,
      user_id: userId,
      storage_path: path,
      role: "primary",
      mime_type: "image/webp",
    });
  check("owned entity asset relationship", !asset.error);
  const download = await db.storage.from("generation-assets").download(path);
  check(
    "owner can download unchanged fixture",
    !download.error && Buffer.from(await download.data.arrayBuffer()).equals(bytes),
  );
  const duplicateId = randomUUID();
  const duplicate = await db
    .from("reference_entity_assets")
    .insert({
      id: duplicateId,
      entity_id: entityId,
      user_id: userId,
      storage_path: `users/${userId}/entities/${entityId}/${duplicateId}.webp`,
      role: "primary",
      mime_type: "image/webp",
    });
  check("duplicate primary rejected", duplicate.error?.code === "23505");
  const invalid = await db
    .from("reference_entity_assets")
    .insert({
      id: randomUUID(),
      entity_id: entityId,
      user_id: randomUUID(),
      storage_path: path + "-invalid",
      role: "detail",
      mime_type: "image/webp",
    });
  check("invalid asset owner rejected", Boolean(invalid.error));
  const removed = await db.storage.from("generation-assets").remove([path]);
  check("owner can delete scoped entity asset", !removed.error && removed.data?.length === 1);
  const missing = await db.storage
    .from("generation-assets")
    .download(path, { cacheNonce: randomUUID() }, { cache: "no-store" });
  check("deleted entity file is unavailable", Boolean(missing.error));
} finally {
  if (created) {
    await db.storage.from("generation-assets").remove([path]);
    const cleanup = await db
      .from("reference_entities")
      .delete()
      .eq("id", entityId)
      .eq("user_id", userId);
    evidence.cleanup = !cleanup.error;
  }
  writeFileSync("benchmark-results/vnext-3-hosted-smoke.json", JSON.stringify(evidence, null, 2));
  await db.auth.signOut();
}
