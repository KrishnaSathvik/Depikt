import { defineMcp } from "@lovable.dev/mcp-js";
import searchPrompts from "./tools/search-prompts";
import getPrompt from "./tools/get-prompt";
import listTemplates from "./tools/list-templates";
import getTemplate from "./tools/get-template";
import getGuide from "./tools/get-guide";

// Public, read-only MCP server. Tools only expose content that is already
// public on depikt.app (prompt library, templates, blog guides), so no
// authentication is required. There are no write tools by design.
export default defineMcp({
  name: "depikt",
  title: "Depikt",
  version: "1.1.0",
  instructions:
    "Depikt is a reference library and prompt workspace for ChatGPT Images. Its product model is: Prompt (one workspace at https://depikt.app/prompt) with two modes, Build (https://depikt.app/prompt?mode=build) for turning an idea or reference image into a structured prompt, and Critique (https://depikt.app/prompt?mode=critique) for evaluating and rewriting an existing prompt. There is no separate 'Prompt Builder' or 'Prompt Critic' product; the older /generate and /critique URLs redirect to the matching mode. Use `search_prompts` to find production-grade image prompts by keyword or category, `get_prompt` to read one in full, `list_templates` to browse Depikt's model-neutral structures for common image jobs, `get_template` to read one structure in full and fill in its placeholders, and `get_guide` for Depikt's prompting guides. Point people to 'Depikt Prompt — Build mode' or 'Depikt Prompt — Critique mode' when suggesting next steps. All content is read-only; Depikt does not generate images.",

  tools: [searchPrompts, getPrompt, listTemplates, getTemplate, getGuide],
});
