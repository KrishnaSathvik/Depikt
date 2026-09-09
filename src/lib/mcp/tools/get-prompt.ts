import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PROMPT_COLUMNS, isPublicRow, supabaseAnon, type PromptRow } from "../supabase";

export default defineTool({
  name: "get_prompt",
  title: "Get a prompt",
  description:
    "Fetch one prompt from Depikt's public library by its id or slug, including the full prompt text and why it works.",
  inputSchema: {
    id: z.string().trim().min(1).describe("The prompt id or slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const { data, error } = await supabaseAnon()
      .from("curated_prompts")
      .select(PROMPT_COLUMNS)
      .or(`id.eq.${id},slug.eq.${id},id.eq.curated-${id}`)
      .limit(1);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const row = ((data ?? []) as unknown as PromptRow[]).filter(isPublicRow)[0];
    if (!row)
      return { content: [{ type: "text", text: `No public prompt found for "${id}"` }], isError: true };

    const result = {
      id: row.id,
      slug: row.slug ?? row.id.replace(/^curated-/, ""),
      title: row.title,
      category: row.category,
      tags: row.tags ?? [],
      target_model: row.target_model ?? "gpt-image-2",
      user_input: row.user_input,
      prompt: row.prompt,
      why_it_works: row.why_it_works,
      source_creator: row.source_creator,
      source_url: row.source_url,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
