import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPostBySlug } from "@/data/posts";

// Read half of the Guides pair. Discovery lives in search_guides.
export default defineTool({
  name: "get_guide",
  title: "Read a Depikt guide",
  description:
    "Read the full text of one Depikt prompting guide by slug. Use `search_guides` first to find the slug. Covers prompt structure, text rendering, infographics, UI mockups, product shots and more.",
  inputSchema: {
    slug: z.string().trim().min(1).describe("Slug of the guide to read in full."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ slug }) => {
    const post = getPostBySlug(slug);
    if (!post)
      return {
        content: [
          {
            type: "text",
            text: `No guide found for slug "${slug}". Use search_guides to find available slugs.`,
          },
        ],
        isError: true,
      };

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
