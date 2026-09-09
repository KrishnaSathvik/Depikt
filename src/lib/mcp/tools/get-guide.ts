import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPostBySlug, getPostsByDate } from "@/data/posts";

export default defineTool({
  name: "get_guide",
  title: "Read a Depikt guide",
  description:
    "List Depikt's published prompting guides, or read the full text of one guide by slug. Covers prompt structure, text rendering, infographics, UI mockups, product shots and more.",
  inputSchema: {
    slug: z
      .string()
      .trim()
      .optional()
      .describe("Slug of the guide to read in full. Omit to list all available guides."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ slug }) => {
    if (!slug) {
      const list = getPostsByDate().map((p) => ({
        slug: p.slug,
        title: p.title,
        category: p.category,
        published: p.published,
        excerpt: p.excerpt,
      }));
      const payload = { count: list.length, guides: list };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    const post = getPostBySlug(slug);
    if (!post)
      return { content: [{ type: "text", text: `No guide found for slug "${slug}"` }], isError: true };

    const payload = {
      slug: post.slug,
      title: post.title,
      category: post.category,
      published: post.published,
      excerpt: post.excerpt,
      content: post.content,
    };
    return {
      content: [{ type: "text", text: `# ${post.title}\n\n${post.content}` }],
      structuredContent: payload,
    };
  },
});
