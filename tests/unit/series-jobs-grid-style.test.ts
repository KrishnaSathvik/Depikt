import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer, type ViteDevServer } from "vite";
import type { GenerationChildJob } from "../../src/lib/generation/use-generation.ts";

let server: ViteDevServer;
let Grid: (props: {
  jobs: GenerationChildJob[];
  onDownload: (id: string) => void;
  onEdit: (id: string) => void;
  onRegenerate: (id: string) => void;
  onNew: () => void;
}) => ReactElement;
before(async () => {
  // Compile the actual React components without a listener, browser, backend or provider.
  server = await createServer({
    configFile: false,
    logLevel: "silent",
    appType: "custom",
    resolve: { alias: { "@": resolve(import.meta.dirname, "../../src") } },
    esbuild: { jsx: "automatic" },
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true },
  });
  Grid = (await server.ssrLoadModule("/src/components/generate/SeriesJobsGrid.tsx")).SeriesJobsGrid;
});
after(async () => {
  await server?.close();
});
const job = (
  n: number,
  status: GenerationChildJob["status"] = "succeeded",
): GenerationChildJob => ({
  jobId: `j${n}`,
  sessionId: "s",
  status,
  operation: "generate",
  model: "flare",
  width: 1200,
  height: 630,
  errorMessage: null,
  label: `Image ${n}`,
  index: n - 1,
  result:
    status === "succeeded"
      ? { versionId: `v${n}`, url: `https://example.com/${n}.png`, width: 1200, height: 630 }
      : null,
});
const render = (jobs: GenerationChildJob[]) =>
  renderToStaticMarkup(
    createElement(Grid, {
      jobs,
      onDownload: () => {},
      onEdit: () => {},
      onRegenerate: () => {},
      onNew: () => {},
    }),
  );

test("every completed series image renders the shared non-cropping canvas and all four actions", () => {
  const html = render([job(1), job(2), job(3), job(4)]);
  for (const label of ["Download", "Edit", "Regenerate image", "New"])
    assert.equal((html.match(new RegExp(`> ${label}`, "g")) ?? []).length, 4, label);
  assert.equal((html.match(/object-contain/g) ?? []).length, 4);
  assert.match(html, /grid-cols-1/);
});

test("queued and running children use the same ThinkingField as single-image generation", () => {
  const html = render([job(1, "queued"), job(2, "running")]);
  assert.equal((html.match(/<canvas/g) ?? []).length, 2);
  assert.doesNotMatch(html, /animate-spin/);
  assert.doesNotMatch(html, /> Download/);
});

test("a successful child waiting for its URL shows Loading image", () => {
  const child = job(1);
  child.result!.url = null;
  const html = render([child]);
  assert.match(html, /Loading image/);
  assert.doesNotMatch(html, /> Download/);
});

test("pending checks alone do not show Refining details or hide result actions", () => {
  const child = job(1);
  child.validation = { verdict: "pass", repairAttempts: 0, refinementPending: true };
  assert.doesNotMatch(render([child]), /Refining details/);
  const html = render([{ ...child, refining: true }, job(2)]);
  assert.equal((html.match(/Refining details/g) ?? []).length, 1);
  assert.equal((html.match(/> Download/g) ?? []).length, 2);
});

test("series controls dispatch the clicked child's version, and New dispatches reset", () => {
  const calls: string[] = [];
  const tree = Grid({
    jobs: [job(1), job(2)],
    onDownload: (id) => calls.push(`download:${id}`),
    onEdit: (id) => calls.push(`edit:${id}`),
    onRegenerate: (id) => calls.push(`regenerate:${id}`),
    onNew: () => calls.push("new"),
  }) as ReactElement<{ children: ReactElement<{ children: ReactElement[] }>[] }>;
  const second = tree.props.children[1];
  const canvas = second.props.children[1] as ReactElement<{
    actions: ReactElement<{
      onDownload: () => void;
      onEdit: () => void;
      onRegenerate: () => void;
      onNew: () => void;
    }>;
  }>;
  const controls = canvas.props.actions.props;
  controls.onDownload();
  controls.onEdit();
  controls.onRegenerate();
  controls.onNew();
  assert.deepEqual(calls, ["download:v2", "edit:v2", "regenerate:v2", "new"]);
});

test("completed output exposes temporal limitation without blocking download or edit", () => {
  const child = job(1);
  child.validation = {
    verdict: "pass_with_limitation",
    repairAttempts: 0,
    warning: true,
    temporalSupport: {
      status: "unverified",
      requested: ["today"],
      supportedBy: [],
      message:
        "Grounded with authoritative references. Current appearance could not be independently verified.",
    },
  };
  const html = render([child]);
  assert.match(html, /role="status"/);
  assert.ok(html.includes(child.validation.temporalSupport!.message));
  for (const label of ["Download", "Edit", "Regenerate image", "New"])
    assert.ok(html.includes(label));
  assert.doesNotMatch(html, /Refining details/);
});
