/**
 * Vitest global setup — loads InsForge credentials for integration tests.
 */
import { beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

process.env.LUMA_FETCH_MODE = "mock";

function loadLinkedInsforgeProject() {
  const projectFile = join(process.cwd(), ".insforge/project.json");
  if (!existsSync(projectFile)) return;

  const project = JSON.parse(readFileSync(projectFile, "utf8")) as {
    oss_host?: string;
    api_key?: string;
  };

  process.env.INSFORGE_URL ??= project.oss_host;
  process.env.INSFORGE_API_KEY ??= project.api_key;
  process.env.NEXT_PUBLIC_INSFORGE_URL ??= project.oss_host;
}

beforeAll(() => {
  loadLinkedInsforgeProject();

  if (!process.env.INSFORGE_URL || !process.env.INSFORGE_API_KEY) {
    throw new Error(
      "InsForge is not linked. Run: npx @insforge/cli link --project-id <id>",
    );
  }
});
