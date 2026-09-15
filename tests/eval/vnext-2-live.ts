// Opt-in VNext 2 live quality scorecard.
//
// CI does not judge pixels. This script prints the frozen cases and the
// PASS / SOFT FAIL / FAIL rubric. Source/mask fixtures are not in the repo
// yet, so it does not call OpenAI.

import { loadVnext2Cases } from "../image-evals/vnext-2/load-cases.ts";

const CORE_IDS = [
  "notebook-color",
  "tulips-color",
  "juice-replacement",
  "jacket-color",
  "remove-object",
  "local-replacement",
] as const;

const AXES = [
  "Requested change",
  "Outside-area preservation",
  "Boundary/blending",
  "Composition preservation",
] as const;

const cases = loadVnext2Cases();
const core = CORE_IDS.map((id) => {
  const c = cases.find((row) => row.id === id);
  if (!c) throw new Error(`missing frozen case ${id}`);
  return c;
});

console.log("VNext 2 precision-edit live scorecard");
console.log("Score each axis: PASS | SOFT FAIL | FAIL");
console.log("Do not invent numerical fidelity percentages.\n");

for (const c of core) {
  console.log(`## ${c.id}`);
  console.log(`Prompt: ${c.prompt}`);
  console.log(`has_mask: ${c.has_mask}  expected.model: ${c.expected.model}`);
  for (const axis of AXES) console.log(`- ${axis}:`);
  console.log("");
}

const whole = cases.find((c) => c.id === "whole-image-edit-regression");
if (whole) {
  console.log(`## ${whole.id} (no mask — VNext 1 edit regression)`);
  console.log(`Prompt: ${whole.prompt}`);
  console.log("- Still whole-image edit (no mask field):");
  console.log("");
}

console.log(
  "Ship bar for pixels: all six core cases requested change = PASS, outside preservation = PASS or acceptable SOFT FAIL. No catastrophic scene regeneration.",
);
