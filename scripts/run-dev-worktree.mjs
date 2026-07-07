#!/usr/bin/env node
/**
 * Start Next.js dev server on the port assigned to this checkout.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const resolveScript = resolve(scriptDir, "resolve-dev-port.mjs");
const cwd = process.cwd();

function isWorktreeCheckout() {
  return cwd.includes("/.worktrees/");
}

function printEnvHelp() {
  if (!isWorktreeCheckout()) {
    console.error("Missing .env.local. Copy .env.example to .env.local and add your keys.");
    return;
  }

  console.error("Missing .env.local in this worktree.");
  console.error("");
  console.error("If main repo has credentials:");
  console.error("  npm run worktree:setup");
  console.error("");
  console.error("If you copied .env.local into the worktree already:");
  console.error("  npm run worktree:setup -- --bootstrap");
  console.error("");
  console.error("First time setup:");
  console.error("  1. In main repo: cp .env.example .env.local");
  console.error("  2. Add Clerk + InsForge keys");
  console.error("  3. In worktree: npm run worktree:setup");
}

if (!existsSync(resolve(cwd, ".env.local"))) {
  printEnvHelp();
  process.exit(1);
}

const resolveProc = spawn("node", [resolveScript, "--ensure"], {
  cwd,
  stdio: ["ignore", "pipe", "inherit"],
});

let portOutput = "";

resolveProc.stdout.on("data", (chunk) => {
  portOutput += chunk.toString();
});

resolveProc.on("close", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const port = portOutput.trim();
  if (!port) {
    console.error("Could not resolve dev port.");
    process.exit(1);
  }

  console.log(`Starting dev server at http://localhost:${port}`);

  const nextBin = resolve(cwd, "node_modules/.bin/next");
  const child = spawn(nextBin, ["dev", "--port", port], {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  child.on("close", (nextCode) => {
    process.exit(nextCode ?? 0);
  });
});
