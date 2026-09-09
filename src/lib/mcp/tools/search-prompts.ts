import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PROMPT_COLUMNS, isPublicRow, supabaseAnon, type PromptRow } from "../supabase";

export default defineTool({
  name: "search_prompts",
  title: "Search prompt library",
  description:
    "Search Depikt's public library of production-grade ChatGPT image prompts by keyword and/or category. Returns matching prompts with their full prompt text.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Keywords to match against prompt title, body and tags. Omit to browse."),
    category: z
      .string()
      .trim()
      .optional()
      .describe("Category filter, e.g. Posters, Infographics, UI Mockups, Cinematic."),
    limit: z.number().int().optional().describe("Max results to return (default 10, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }) => {
    const take = Math.min(Math.max(limit ?? 10, 1), 50);
    let request = supabaseAnon()
      .from("curated_prompts")
      .select(PROMPT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(take * 3);

    if (category) request = request.ilike("category", category);
    if (query) {
      const q = query.replace(/[%,]/g, " ").trim();
      if (q) request = request.or(`title.ilike.%${q}%,prompt.ilike.%${q}%,category.ilike.%${q}%`);
    }

    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = ((data ?? []) as unknown as PromptRow[]).filter(isPublicRow).slice(0, take);
    const results = rows.map((r) => ({
      id: r.id,
      slug: r.slug ?? r.id.replace(/^curated-/, ""),
      title: r.title,
      category: r.category,
      tags: r.tags ?? [],
      target_model: r.target_model ?? "gpt-image-2",
      prompt: r.prompt,
      why_it_works: r.why_it_works,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});
