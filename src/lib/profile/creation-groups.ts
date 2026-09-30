import type { CreationItem } from "./client.ts";
export type CreationGroup = { kind: "single" | "series"; items: CreationItem[] };

/** Recomputed over all loaded pages; interleaving and duplicate pagination rows are harmless. */
export function groupCreations(items: CreationItem[]): CreationGroup[] {
  const groups: CreationGroup[] = [];
  const sessions = new Map<string, CreationGroup>();
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.sessionId && item.seriesIndex != null) {
      let group = sessions.get(item.sessionId);
      if (!group) {
        group = { kind: "series", items: [] };
        sessions.set(item.sessionId, group);
        groups.push(group);
      }
      group.items.push(item);
    } else {
      const previous = groups.at(-1);
      if (previous?.kind === "single") previous.items.push(item);
      else groups.push({ kind: "single", items: [item] });
    }
  }
  for (const group of groups) {
    if (group.kind === "series")
      group.items.sort((a, b) => (a.seriesIndex ?? 0) - (b.seriesIndex ?? 0));
  }
  return groups;
}
