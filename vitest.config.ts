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
          // Every integration file shares one InsForge database and wipes it in
          // beforeEach, so files must run one at a time or they race and delete
          // rows out from under each other.
          fileParallelism: false,
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
