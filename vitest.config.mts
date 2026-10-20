import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Testes rápidos (sem banco). Os de banco ficam em *.int.test.ts (ver vitest.integracao.config.mts).
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next", ".superpowers", "**/*.int.test.ts"],
  },
});
