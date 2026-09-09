import { defineMcp } from "@lovable.dev/mcp-js";
import searchPrompts from "./tools/search-prompts";
import getPrompt from "./tools/get-prompt";
import listTemplates from "./tools/list-templates";
import getGuide from "./tools/get-guide";

export default defineMcp({
  name: "depikt",
  title: "Depikt",
  version: "1.0.0",
  instructions:
    "Depikt is a reference library and prompt workspace for ChatGPT Images. Use `search_prompts` to find production-grade image prompts by keyword or category, `get_prompt` to read one in full, `list_templates` for reusable prompt formulas, and `get_guide` for Depikt's prompting guides. All content is public and read-only; Depikt does not generate images.",
  tools: [searchPrompts, getPrompt, listTemplates, getGuide],
});
