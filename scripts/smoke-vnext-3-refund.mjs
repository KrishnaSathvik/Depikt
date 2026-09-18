// Explicit application/hosted lifecycle smoke. Reserves then refunds one credit;
// removes its pack before execution, so no image provider request is made.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
process.loadEnvFile(".env.local");
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await db.auth.signInWithPassword({
  email: process.env.VITE_DEV_AUTH_EMAIL,
  password: process.env.VITE_DEV_AUTH_PASSWORD,
});
if (error || !data.session) throw new Error("Test account authentication failed");
const evidence = { at: new Date().toISOString(), checks: [] };
async function api(path, method = "GET", body, status = 200) {
  const res = await fetch("http://127.0.0.1:8080/api/generation" + path, {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status !== status)
    throw new Error(`${method} ${path}: expected ${status}, got ${res.status}`);
  return res.json();
}
function check(label, ok) {
  if (!ok) throw new Error(label);
  evidence.checks.push({ label, result: "PASS" });
  console.log(`PASS: ${label}`);
}
let entityId;
try {
  const before = await api("/credits");
  check("test account has one reservable credit", before.availableCredits >= 1);
  const entity = await api(
    "/entities",
    "POST",
    { name: "Refund smoke " + randomUUID().slice(0, 8), type: "character" },
    201,
  );
  entityId = entity.id;
  await api(
    `/entities/${entityId}/assets`,
    "POST",
    {
      role: "primary",
      dataUrl:
        "data:image/webp;base64," +
        readFileSync("tests/image-evals/vnext-3/fixtures/character-a/primary.webp").toString(
          "base64",
        ),
    },
    201,
  );
  const source = JSON.parse(
    readFileSync("benchmark-results/vnext-3-2026-09-16T20-05-27.006Z/results.json", "utf8"),
  ).results.find((r) => r.id === "character-portrait");
  const plan = await api("/plans", "POST", {
    prompt: "Portrait of Maya. Hosted failure/refund smoke.",
    intent: source.intent,
    entityIds: [entityId],
  });
  const created = await api(
    "/jobs",
    "POST",
    { planToken: plan.planToken, idempotencyKey: randomUUID(), sourceContext: { type: "direct" } },
    202,
  );
  evidence.jobId = created.jobs[0].id;
  const reserved = await api("/credits");
  check(
    "signed locked job reserves one credit",
    reserved.availableCredits === before.availableCredits - 1,
  );
  await api(`/entities/${entityId}`, "DELETE");
  entityId = null;
  await api(`/jobs/${evidence.jobId}/run`, "POST", { referencePaths: [] }, 500);
  const job = await api(`/jobs/${evidence.jobId}`);
  const after = await api("/credits");
  check(
    "missing locked reference fails job without an output",
    job.status === "failed" && job.result === null && /reference/i.test(job.errorMessage),
  );
  check(
    "failed locked job refunds its reserved credit",
    after.availableCredits === before.availableCredits,
  );
} finally {
  if (entityId) await api(`/entities/${entityId}`, "DELETE");
  writeFileSync("benchmark-results/vnext-3-refund-smoke.json", JSON.stringify(evidence, null, 2));
  await db.auth.signOut();
}
