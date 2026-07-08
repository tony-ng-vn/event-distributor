#!/usr/bin/env node
/**
 * List dev-server ports for all git worktrees in this repo.
 *
 * Reads:
 *   .worktrees/dev-servers.json
 *   .worktrees/<name>/.worktree-dev-port.json
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);

function gitRoot() {
  return execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
}

function mainRepoRoot(root) {
  const marker = "/.worktrees/";
  const index = root.indexOf(marker);
  if (index === -1) return root;
  return root.slice(0, index);
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function collectEntries(mainRoot) {
  const entries = new Map();

  const registryPath = resolve(mainRoot, ".worktrees/dev-servers.json");
  const registry = readJson(registryPath);
  for (const item of registry?.worktrees ?? []) {
    if (item?.path && item?.port) {
      entries.set(item.path, item);
    }
  }

  const worktreesDir = resolve(mainRoot, ".worktrees");
  if (existsSync(worktreesDir)) {
    for (const name of readdirSync(worktreesDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const metaPath = resolve(worktreesDir, name.name, ".worktree-dev-port.json");
      const meta = readJson(metaPath);
      if (meta?.path && meta?.port) {
        entries.set(meta.path, meta);
      }
    }
  }

  return [...entries.values()].sort((a, b) => a.port - b.port);
}

function printHelp() {
  console.log(`Usage: node scripts/worktree-dev-registry.mjs [command]

Commands:
  list    Show all known worktree dev servers (default)
  json    Print registry as JSON`);
}

const command = args[0] ?? "list";

if (command === "--help" || command === "-h" || command === "help") {
  printHelp();
  process.exit(0);
}

const root = gitRoot();
const mainRoot = mainRepoRoot(root);
const entries = collectEntries(mainRoot);

const payload = {
  mainRepo: mainRoot,
  mainPort: 3000,
  mainUrl: "http://localhost:3000",
  worktrees: entries,
};

if (command === "json") {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

if (command !== "list") {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

console.log(`Main repo:  http://localhost:3000  (${mainRoot})`);

if (entries.length === 0) {
  console.log("Worktrees:  (none registered yet — run npm run dev:worktree in a worktree)");
} else {
  console.log("Worktrees:");
  for (const entry of entries) {
    const branch = entry.branch ? ` [${entry.branch}]` : "";
    console.log(`  ${entry.url}  ${entry.path}${branch}`);
  }
}
