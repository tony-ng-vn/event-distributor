/** Vitest config — unit + integration test projects under tests/, @ alias → src/ */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          setupFiles: ["./tests/setup.unit.ts"],
          include: ["tests/unit/**/*.test.ts"],
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      },
      {
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["./tests/setup.integration.ts"],
          include: ["tests/integration/**/*.test.ts"],
        },
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      },
    ],
  },
});
