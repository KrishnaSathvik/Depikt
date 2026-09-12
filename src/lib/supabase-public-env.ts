/**
 * Public Supabase URL + publishable key for the browser client.
 *
 * Vite only inlines `import.meta.env.VITE_*` when each key is a static
 * property access. Dynamic `import.meta.env[\`VITE_${name}\`]` is empty in
 * production, and Lovable's client build only receives a subset of VITE_
 * vars (today: project id + generation flag). The Worker still has
 * unprefixed `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` at request time,
 * so SSR writes them onto `window` before the app module runs.
 */

export type SupabasePublicConfig = { url: string; key: string };

export type SupabasePublicEnvInput = {
  viteUrl?: string;
  viteKey?: string;
  viteAnon?: string;
  viteProjectId?: string;
  processUrl?: string;
  processKey?: string;
  processAnon?: string;
  processProjectId?: string;
  runtime?: { url?: string; key?: string };
};

declare global {
  interface Window {
    __DEPIKT_SUPABASE__?: { url?: string; key?: string };
  }
}

function trim(value?: string): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function urlFromProjectId(projectId?: string): string | undefined {
  const id = trim(projectId);
  if (!id) return undefined;
  if (/^https?:\/\//i.test(id)) return id;
  return `https://${id}.supabase.co`;
}

export function resolveSupabasePublicConfig(
  input: SupabasePublicEnvInput,
): Partial<SupabasePublicConfig> {
  const runtimeUrl = trim(input.runtime?.url);
  const runtimeKey = trim(input.runtime?.key);
  if (runtimeUrl && runtimeKey) return { url: runtimeUrl, key: runtimeKey };

  const url =
    trim(input.viteUrl) ||
    trim(input.processUrl) ||
    urlFromProjectId(input.viteProjectId) ||
    urlFromProjectId(input.processProjectId);
  const key =
    trim(input.viteKey) ||
    trim(input.processKey) ||
    trim(input.viteAnon) ||
    trim(input.processAnon);
  return { url, key };
}

function readViteEnv(): Pick<
  SupabasePublicEnvInput,
  "viteUrl" | "viteKey" | "viteAnon" | "viteProjectId"
> {
  // Static property access only — see file comment.
  return {
    viteUrl: import.meta.env.VITE_SUPABASE_URL,
    viteKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    viteAnon: import.meta.env.VITE_SUPABASE_ANON_KEY,
    viteProjectId: import.meta.env.VITE_SUPABASE_PROJECT_ID,
  };
}

function readProcessEnv(): Pick<
  SupabasePublicEnvInput,
  "processUrl" | "processKey" | "processAnon" | "processProjectId"
> {
  if (typeof process === "undefined" || !process.env) return {};
  const env = process.env;
  return {
    processUrl: env.SUPABASE_URL ?? env.VITE_SUPABASE_URL,
    processKey: env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY,
    processAnon: env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY,
    processProjectId: env.SUPABASE_PROJECT_ID ?? env.VITE_SUPABASE_PROJECT_ID,
  };
}

function readWindowRuntime(): { url?: string; key?: string } | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.__DEPIKT_SUPABASE__;
  if (!raw || typeof raw !== "object") return undefined;
  return { url: raw.url, key: raw.key };
}

function serializeConfig(config: SupabasePublicConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}

export function getSupabasePublicConfig(): Partial<SupabasePublicConfig> {
  return resolveSupabasePublicConfig({
    ...readViteEnv(),
    ...readProcessEnv(),
    runtime: readWindowRuntime(),
  });
}

export function isSupabasePublicConfigured(
  config: Partial<SupabasePublicConfig> = getSupabasePublicConfig(),
): config is SupabasePublicConfig {
  return Boolean(config.url && config.key);
}

/** Inline <head> boot so the client bundle can create a Supabase client. */
export function supabasePublicEnvInlineScript(): string | null {
  const fromWindow = readWindowRuntime();
  const config = resolveSupabasePublicConfig({
    ...readViteEnv(),
    ...readProcessEnv(),
    runtime: fromWindow,
  });
  if (!config.url || !config.key) return null;
  return `window.__DEPIKT_SUPABASE__=${serializeConfig({ url: config.url, key: config.key })};`;
}
