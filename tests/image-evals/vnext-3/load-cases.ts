import { readFileSync } from "node:fs";
export interface Vnext3Case {
  id: string;
  entities: string[];
  prompt: string;
  expected: {
    operation: "edit" | "generate";
    model: "sunburst" | "flare";
    maxImages: number;
    distinct: boolean;
  };
}
export function loadVnext3Cases(): Vnext3Case[] {
  return JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));
}
