import test from "node:test";
import assert from "node:assert/strict";
import { savedCreationDetails } from "../../src/lib/profile/creation-detail.ts";
import { userFacingPrompt } from "../../src/lib/generation/user-facing-prompt.ts";
import { resultStatusLines } from "../../src/lib/generation/result-status.ts";
import type { CreationItem } from "../../src/lib/profile/client.ts";
const base: CreationItem = {
  id: "one",
  jobId: "job",
  sessionId: "session",
  url: null,
  width: 1024,
  height: 1024,
  prompt: "A poster",
  model: "flare",
  createdAt: "2026-09-01",
  operation: "generate",
  parentVersionId: null,
  seriesIndex: null,
  seriesLabel: null,
};
test("saved details preserve sources and actual lineage without leaking execution metadata", () => {
  const result = savedCreationDetails(
    [base, { ...base, id: "two", parentVersionId: "one" }],
    [
      {
        id: "job",
        operation: "generate",
        usage_json: {
          validation: { verdict: "pass", repairAttempts: 2, repairOutcome: "improved" },
        },
      },
    ],
    {
      secret: "never-return",
      grounding: {
        seal: "never-return",
        bundle: {
          sources: [
            { title: "Official source", url: "https://example.com" },
            { title: "Unsafe", url: "javascript:alert(1)" },
          ],
        },
      },
    },
  );
  assert.equal(result.versions[1].lineage, "Automatic refinement");
  assert.equal(result.versions[1].sources.length, 1);
  assert.ok(result.versions[1].statusLines.some((line) => line.title === "Refined automatically"));
  assert.ok(!result.versions[0].statusLines.some((line) => line.title === "Refined automatically"));
  assert.doesNotMatch(JSON.stringify(result), /never-return|issues corrected/);
});
test("historic missing metadata stays absent and empty grounding is not Grounded", () => {
  const result = savedCreationDetails([base], [], {});
  assert.deepEqual(result.versions[0].sources, []);
  assert.deepEqual(result.versions[0].statusLines, []);
  assert.equal(result.versions[0].lineage, null);
  assert.deepEqual(resultStatusLines({ sourceCount: 0 }), []);
});
test("legacy compiled series tail is hidden without removing ordinary user instructions", () => {
  const brief = "A single standalone image with a blue product.";
  const compiled =
    brief +
    ' Use aspect ratio 3:4. This is a single standalone image, not a collage. Render this exact text verbatim: headline: "HELLO". Do not add scene-name labels, headlines, or captions beyond the exact copy specified for this image. Preserve text already present on referenced products and logos. Keep these series consistency requirements: blue palette.';
  assert.equal(userFacingPrompt(compiled), brief);
  assert.equal(userFacingPrompt(brief), brief);
});

test("an unselected repair candidate does not inherit the original result validation", () => {
  const result = savedCreationDetails(
    [base, { ...base, id: "candidate", parentVersionId: base.id }],
    [
      {
        id: "job",
        operation: "generate",
        usage_json: {
          validation: {
            verdict: "pass",
            repairAttempts: 1,
            repairOutcome: "not_improved",
            selected: "original",
          },
        },
      },
    ],
    {},
  );
  assert.ok(result.versions[0].statusLines.some((line) => line.title === "Validated"));
  assert.deepEqual(result.versions[1].statusLines, []);
});
