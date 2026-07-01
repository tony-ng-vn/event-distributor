#!/usr/bin/env node
/**
 * Local check-in — run the same gates as CI / Vercel before you push.
 *
 * Usage:
 *   npm run check          # lint + typecheck + unit tests (fast)
 *   npm run check:deploy   # above + production build (matches Vercel)
 *   npm run check:full     # deploy checks + integration tests (needs InsForge)
 *
 * Results are cached under .check-in/ for the last run (latest.json + latest.log).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cacheDir = join(root, ".check-in");
const args = new Set(process.argv.slice(2));
const withIntegration = args.has("--with-integration") || args.has("--full");
const deploy = args.has("--deploy") || args.has("--full") || args.has("-d");

/** @type {{ name: string; command: string; args: string[] }[]} */
const steps = [
  { name: "lint", command: "npm", args: ["run", "lint"] },
  { name: "typecheck", command: "npm", args: ["run", "typecheck"] },
  { name: "test:unit", command: "npm", args: ["run", "test:unit"] },
];

if (withIntegration) {
  steps.push({ name: "test:integration", command: "npm", args: ["run", "test:integration"] });
}

if (deploy) {
  steps.push({ name: "build", command: "npm", args: ["run", "build"] });
}

/** @type {{ name: string; ok: boolean; durationMs: number; exitCode: number | null; errorExcerpt: string | null }[]} */
const results = [];
/** @type {string[]} */
const logLines = [];

function runStep(step) {
  const started = Date.now();
  logLines.push(`\n==> ${step.name}\n`);

  const result = spawnSync(step.command, step.args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (output) logLines.push(output);

  const ok = result.status === 0;
  const durationMs = Date.now() - started;

  return {
    name: step.name,
    ok,
    durationMs,
    exitCode: result.status,
    errorExcerpt: ok ? null : excerptErrors(output),
  };
}

function excerptErrors(output) {
  const lines = output.split("\n");
  const hits = lines.filter(
    (line) =>
      /error TS/i.test(line) ||
      /Type error:/i.test(line) ||
      /✖|×|FAIL|Failed/i.test(line) ||
      /eslint/i.test(line),
  );
  const excerpt = (hits.length > 0 ? hits : lines.slice(-12)).slice(0, 20);
  return excerpt.join("\n").trim() || "Check failed with no captured output.";
}

mkdirSync(cacheDir, { recursive: true });

console.log(
  deploy
    ? "Check-in (deploy): lint → typecheck → unit tests → build"
    : withIntegration
      ? "Check-in (full): lint → typecheck → unit + integration tests"
      : "Check-in: lint → typecheck → unit tests",
);
console.log(`Caching results in ${cacheDir}/\n`);

let failed = false;

for (const step of steps) {
  const result = runStep(step);
  results.push(result);

  if (result.ok) {
    console.log(`✓ ${result.name} (${result.durationMs}ms)`);
  } else {
    failed = true;
    console.error(`✗ ${result.name} (${result.durationMs}ms)`);
    if (result.errorExcerpt) {
      console.error("\n" + result.errorExcerpt + "\n");
    }
    break;
  }
}

const report = {
  timestamp: new Date().toISOString(),
  mode: deploy ? (withIntegration ? "full" : "deploy") : withIntegration ? "integration" : "quick",
  ok: !failed,
  steps: results,
};

writeFileSync(join(cacheDir, "latest.json"), JSON.stringify(report, null, 2) + "\n");
writeFileSync(join(cacheDir, "latest.log"), logLines.join("\n") + "\n");

if (failed) {
  console.error(
    `\nCheck-in failed. Cached report: .check-in/latest.json\nRun \`npm run check:deploy\` before pushing to catch Vercel build errors.\n`,
  );
  process.exit(1);
}

console.log("\nCheck-in passed. Cached report: .check-in/latest.json\n");
process.exit(0);
