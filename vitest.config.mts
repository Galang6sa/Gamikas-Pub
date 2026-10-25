import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite berbasis Rolldown memakai oxc untuk JSX, bukan esbuild.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node", include: ["**/*.test.{ts,tsx}"], exclude: ["node_modules/**", ".next/**"] },
});
