import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { templates } from "@/data/templates";

export default defineTool({
  name: "list_templates",
  title: "List prompt templates",
  description:
    "List Depikt's prompt templates — reusable prompt formulas, each answering one question with a copy-ready prompt and an explanation of why it works.",
  inputSchema: {
    category: z.string().trim().optional().describe("Optional category filter, e.g. Posters."),
    slug: z.string().trim().optional().describe("Return only the template with this slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, slug }) => {
    let results = templates;
    if (slug) results = results.filter((t) => t.slug === slug);
    if (category) results = results.filter((t) => t.category.toLowerCase() === category.toLowerCase());

    const payload = {
      count: results.length,
      templates: results.map((t) => ({ ...t })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
