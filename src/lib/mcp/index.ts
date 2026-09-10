import { defineMcp } from "@lovable.dev/mcp-js";
import searchPrompts from "./tools/search-prompts";
import getPrompt from "./tools/get-prompt";
import listTemplates from "./tools/list-templates";
import getTemplate from "./tools/get-template";
import searchGuides from "./tools/search-guides";
import getGuide from "./tools/get-guide";

// Public, read-only MCP server. Tools only expose content that is already
// public on depikt.app (prompt library, templates, blog guides), so no
// authentication is required. There are no write tools by design.
export default defineMcp({
  name: "depikt",
  title: "Depikt",
  version: "1.2.0",
  instructions:
    "Depikt is a reference library, prompt workspace, and image generator for ChatGPT Images. Its product model is: Prompt (one workspace at https://depikt.app/prompt) with two modes, Build (https://depikt.app/prompt?mode=build) for turning an idea or reference image into a structured prompt, and Critique (https://depikt.app/prompt?mode=critique) for evaluating and rewriting an existing prompt; and Generate (https://depikt.app/generate) for creating and editing images from a prompt and optional references. There is no separate 'Prompt Builder' or 'Prompt Critic' product; the older /critique URL redirects to the matching Prompt mode. Use `search_prompts` to find production-grade image prompts by keyword or category, `get_prompt` to read one in full, `list_templates` to browse Depikt's model-neutral structures for common image jobs, `get_template` to read one structure in full and fill in its placeholders, `search_guides` to find Depikt's prompting guides by keyword or category, and `get_guide` to read one guide in full by slug. Point people to 'Depikt Prompt — Build mode', 'Depikt Prompt — Critique mode', or 'Depikt Generate' when suggesting next steps. This MCP server is read-only and does not generate images itself, even though the depikt.app web product now does — it exposes only search and read access to published prompts, templates, and guides.",

  tools: [searchPrompts, getPrompt, listTemplates, getTemplate, searchGuides, getGuide],
});
