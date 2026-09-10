import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPostsByDate } from "@/data/posts";

// Discovery half of the Guides pair (search_guides → get_guide), mirroring
// search_prompts → get_prompt and list_templates → get_template. Reads the
// same post list as /blog so the website and assistants cannot drift apart.
export default defineTool({
  name: "search_guides",
  title: "Search guides",
  description:
    "Search Depikt's published prompting guides by keyword and/or category. Returns an overview (slug, title, category, date, excerpt); use `get_guide` with a slug to read one guide in full. Omit both filters to list every guide.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Keywords to match against guide title, excerpt, and category. Omit to browse."),
    category: z
      .string()
      .trim()
      .optional()
      .describe("Category filter, e.g. Images 2.5, How-to, Reference, Comparison, Product."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, category }) => {
    let results = getPostsByDate();
    if (category) {
      const c = category.toLowerCase();
      results = results.filter((p) => p.category.toLowerCase() === c);
    }
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    const categories = [...new Set(getPostsByDate().map((p) => p.category))];
    const payload = {
      count: results.length,
      categories,
      guides: results.map((p) => ({
        slug: p.slug,
        title: p.title,
        category: p.category,
        date: p.published,
        excerpt: p.excerpt,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
