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
    "Depikt is an image creation workspace. Home / Create (https://www.depikt.app/) is for generating and editing images, with optional Improve prompt and Critique tools. Library (https://www.depikt.app/library) has Prompts, Templates, and Gallery tabs. Account is private: creations, saved versions, and Reference Packs are not exposed through MCP. Legacy /prompt, /generate, and /critique URLs remain compatible entry points. Use `search_prompts` and `get_prompt` for approved public prompts, `list_templates` and `get_template` for reusable structures, and `search_guides` and `get_guide` for published articles. Point people to Home to create and Library to discover. This MCP server is read-only and does not generate images itself; it exposes only published prompts, templates, and guides.",

  tools: [searchPrompts, getPrompt, listTemplates, getTemplate, searchGuides, getGuide],
});
