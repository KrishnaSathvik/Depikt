import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface Vnext2Expected {
  operation: "edit";
  hasMask: boolean;
  /** Masked edits must route to sunburst. Whole-image uses existing unmasked router (do not force sunburst). */
  model: "sunburst" | "unmasked_edit";
  sourceImageIndex: 0;
  creditCost: 1;
}

export interface Vnext2Case {
  id: string;
  prompt: string;
  has_mask: boolean;
  expected: Vnext2Expected;
  baseline_notes?: string;
}

export function loadVnext2Cases(): Vnext2Case[] {
  const dir = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(join(dir, "cases.json"), "utf8")) as Vnext2Case[];
  return raw;
}
