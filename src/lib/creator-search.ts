export type PromptMode = "generate" | "build" | "critique";

export interface PromptSearch {
  mode?: PromptMode;
  seed?: string;
  prefill?: string;
  remixRef?: string;
  restore?: string;
  ref?: string;
  /** Template slug from /templates. Answered values live in session storage, never in the URL. */
  template?: string;
}

/** Generate is the default destination. Deep links to Build and Critique stay. */
export function parsePromptMode(value: unknown): PromptMode {
  if (value === "critique") return "critique";
  if (value === "build") return "build";
  return "generate";
}

export const validateCreatorSearch = (search: Record<string, unknown>): PromptSearch => {
  const { seed, prefill, restore, ref, template } = search;
  return {
    mode: search.mode === undefined ? undefined : parsePromptMode(search.mode),
    template:
      typeof template === "string" && /^[a-z0-9-]{1,80}$/.test(template) ? template : undefined,
    seed: typeof seed === "string" && seed.length > 0 && seed.length <= 4000 ? seed : undefined,
    prefill:
      typeof prefill === "string" && prefill.length > 0 && prefill.length <= 4000
        ? prefill
        : undefined,
    remixRef:
      typeof search.remixRef === "string" &&
      search.remixRef.length > 0 &&
      search.remixRef.length <= 8000
        ? search.remixRef
        : undefined,
    restore: typeof restore === "string" && restore.length > 0 ? restore : undefined,
    ref: typeof ref === "string" && ref.startsWith("/gallery/") ? ref : undefined,
  };
};
