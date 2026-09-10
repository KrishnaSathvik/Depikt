// Regenerates src/routeTree.gen.ts outside of `vite dev` (same generator the
// TanStack Start plugin runs). Usage: node scripts/gen-routes.mjs
import { Generator, getConfig } from "@tanstack/router-generator";
const root = process.cwd();
const config = getConfig(
  {
    routesDirectory: "./src/routes",
    generatedRouteTree: "./src/routeTree.gen.ts",
    target: "react",
  },
  root,
);
await new Generator({ config, root }).run();
console.log("routeTree regenerated");
