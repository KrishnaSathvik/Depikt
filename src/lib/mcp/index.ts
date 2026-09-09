import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPrompts from "./tools/search-prompts";
import getPrompt from "./tools/get-prompt";
import listTemplates from "./tools/list-templates";
import getGuide from "./tools/get-guide";
import { supabaseProjectUrl } from "./supabase";

// Auth: the MCP endpoint is public on the internet, so it requires a valid
// Supabase-issued OAuth/JWT access token. Tools stay read-only and only expose
// already-public library content, but callers must authenticate.
const issuerUrl = `${supabaseProjectUrl().replace(/\/+$/, "")}/auth/v1`;

export default defineMcp({
  name: "depikt",
  title: "Depikt",
  version: "1.0.0",
  auth: auth.oauth.issuer({
    issuer: issuerUrl,
    acceptedAudiences: ["authenticated"],
    resourceName: "Depikt",
    resourceDocumentation: "https://depikt.app/integrations/mcp",
  }),
  instructions:
    "Depikt is a reference library and prompt workspace for ChatGPT Images. Use `search_prompts` to find production-grade image prompts by keyword or category, `get_prompt` to read one in full, `list_templates` for reusable prompt formulas, and `get_guide` for Depikt's prompting guides. All content is read-only; Depikt does not generate images.",
  tools: [searchPrompts, getPrompt, listTemplates, getGuide],
});
