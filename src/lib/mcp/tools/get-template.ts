import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { COMPATIBILITY_NOTE, activeTemplates, getTemplateBySlug } from "@/data/templates";

// Same canonical catalogue as /templates — one source, no hidden copy.
export default defineTool({
  name: "get_template",
  title: "Get one image template",
  description:
    "Return one Depikt image template in full: its fields, the model-neutral prompt structure with [PLACEHOLDER] slots, and a worked example. Fill the placeholders with the user's details to produce a starting prompt.",
  inputSchema: {
    id: z
      .string()
      .trim()
      .describe("Template id or slug, e.g. poster-flyer, product-photography, precise-image-edit."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const key = id.toLowerCase();
    const template =
      getTemplateBySlug(key) ??
      activeTemplates.find((t) => t.id === key || t.title.toLowerCase() === key);

    if (!template || !template.active) {
      const known = activeTemplates.map((t) => t.slug).join(", ");
      return {
        isError: true,
        content: [{ type: "text" as const, text: `No template "${id}". Available: ${known}` }],
      };
    }

    const payload = {
      id: template.id,
      slug: template.slug,
      title: template.title,
      group: template.group,
      description: template.description,
      best_for: template.best_for,
      compatibility: template.compatibility,
      compatibility_note: COMPATIBILITY_NOTE[template.compatibility],
      fields: template.fields.map((f) => ({
        key: f.key,
        label: f.label,
        hint: f.hint ?? null,
        example: template.example_input[f.key] ?? null,
      })),
      template_prompt: template.template_prompt,
      tags: template.tags,
      url: "https://depikt.app/templates",
      usage:
        "Replace each [PLACEHOLDER] with the user's details. The structure is model-neutral: add model-specific parameters (aspect flags, quality settings) separately, not inside the prompt text.",
    };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
