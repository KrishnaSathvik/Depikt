// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { loadEnv, type ConfigEnv } from "vite";

const baseConfig = defineConfig({
  vite: {
    plugins: [mcpPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("@radix-ui")) return "radix-vendor";
            if (id.includes("@supabase")) return "supabase-vendor";
            if (id.includes("lucide-react")) return "icons-vendor";
          },
        },
      },
    },
  },
});

export default (env: ConfigEnv) => {
  // The base dev config injects VITE_* only. These existing server-only flags
  // must reach process.env without exposing credentials or baking activation
  // into a deployable bundle. Production runtime values live in Wrangler.
  if (env.command === "serve") {
    const flags = loadEnv(env.mode, process.cwd(), [
      "GROUNDING_ENABLED",
      "VALIDATION_REPAIR_ENABLED",
      "AUTO_REPAIR_POLICY",
    ]);
    process.env.GROUNDING_ENABLED = flags.GROUNDING_ENABLED ?? "false";
    process.env.VALIDATION_REPAIR_ENABLED = flags.VALIDATION_REPAIR_ENABLED ?? "false";
    process.env.AUTO_REPAIR_POLICY = flags.AUTO_REPAIR_POLICY ?? "disabled";
  }
  return baseConfig(env);
};
