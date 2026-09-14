import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Intent } from "../../../src/lib/prompt-engine/intent.ts";
import type { OutputMode } from "../../../src/lib/generation/plan.ts";

export interface Vnext1Expected {
  mode: OutputMode;
  desiredCount: number;
  autoCount: number;
  search_needed: boolean;
  separate_assets: boolean;
}

export interface Vnext1Case {
  id: string;
  prompt: string;
  has_reference: boolean;
  expected: Vnext1Expected;
  fixture_intent: Intent;
  baseline_notes?: string;
}

export function loadVnext1Cases(): Vnext1Case[] {
  const dir = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(join(dir, "cases.json"), "utf8")) as Vnext1Case[];
  return raw;
}
