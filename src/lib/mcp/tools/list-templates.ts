import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { COMPATIBILITY_NOTE, TEMPLATE_GROUPS, activeTemplates } from "@/data/templates";

// Reads the same canonical catalogue as the /templates page, so the website
// and assistants can never drift apart.
export default defineTool({
  name: "list_templates",
  title: "List image templates",
  description:
    "List Depikt's model-neutral image templates — reusable structures for common image jobs (poster, product photo, infographic, UI concept, precise edit, reference composition, and more). Returns an overview; use `get_template` for one full structure.",
  inputSchema: {
    group: z
      .enum(["Create", "Structure", "Edit", "References", "Brand"])
      .optional()
      .describe("Optional group filter."),
    query: z.string().trim().optional().describe("Optional keyword filter over title and tags."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ group, query }) => {
    let results = activeTemplates;
    if (group) results = results.filter((t) => t.group === group);
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.best_for.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      );
    }

    const payload = {
      count: results.length,
      groups: TEMPLATE_GROUPS,
      templates: results
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({
          id: t.id,
          slug: t.slug,
          title: t.title,
          group: t.group,
          description: t.description,
          best_for: t.best_for,
          fields: t.fields.map((f) => f.label),
          tags: t.tags,
          compatibility: t.compatibility,
          compatibility_note: COMPATIBILITY_NOTE[t.compatibility],
        })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
