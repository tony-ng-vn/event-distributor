#!/usr/bin/env node
/**
 * Resolve a stable dev-server port for the current git checkout.
 *
 * - Main repo checkout: port 3000
 * - Git worktree under .worktrees/: unique port in 3100–3899 (hash of path)
 *
 * Writes local metadata agents can read:
 *   .worktree-dev-port        — plain port number
 *   .worktree-dev-port.json   — path, branch, url
 *   .worktrees/dev-servers.json (main repo) — registry of all worktree servers
 */
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAIN_PORT = 3000;
const WORKTREE_BASE = 3100;
const WORKTREE_RANGE = 800;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

function runGit(args, runCwd = cwd) {
  return execSync(`git ${args.join(" ")}`, {
    cwd: runCwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitRoot(runCwd = cwd) {
  return runGit(["rev-parse", "--show-toplevel"], runCwd);
}

function gitBranch(runCwd = cwd) {
  try {
    return runGit(["branch", "--show-current"], runCwd);
  } catch {
    return "";
  }
}

function isWorktreeCheckout(root) {
  return root.includes("/.worktrees/");
}

function mainRepoRoot(root) {
  const marker = "/.worktrees/";
  const index = root.indexOf(marker);
  if (index === -1) return root;
  return root.slice(0, index);
}

function stableWorktreePort(root) {
  const hash = createHash("sha256").update(root).digest();
  const offset = hash.readUInt16BE(0) % WORKTREE_RANGE;
  return WORKTREE_BASE + offset;
}

function readPortFile(root) {
  const portFile = resolve(root, ".worktree-dev-port");
  if (!existsSync(portFile)) return null;
  const value = Number.parseInt(readFileSync(portFile, "utf8").trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function writeMetadata(root, port, branch) {
  const portFile = resolve(root, ".worktree-dev-port");
  const metaFile = resolve(root, ".worktree-dev-port.json");

  writeFileSync(portFile, `${port}\n`, "utf8");
  writeFileSync(
    metaFile,
    `${JSON.stringify(
      {
        port,
        path: root,
        branch,
        url: `http://localhost:${port}`,
        assignedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function updateRegistry(mainRoot, entry) {
  const registryDir = resolve(mainRoot, ".worktrees");
  const registryPath = resolve(registryDir, "dev-servers.json");

  mkdirSync(registryDir, { recursive: true });

  let registry = { worktrees: [] };
  if (existsSync(registryPath)) {
    registry = JSON.parse(readFileSync(registryPath, "utf8"));
  }

  registry.worktrees = (registry.worktrees ?? []).filter(
    (item) => item.path !== entry.path,
  );
  registry.worktrees.push(entry);
  registry.updatedAt = new Date().toISOString();

  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

function resolvePort({ ensure = false } = {}) {
  const root = gitRoot();
  const branch = gitBranch(root);

  if (!isWorktreeCheckout(root)) {
    return {
      port: MAIN_PORT,
      root,
      branch,
      isWorktree: false,
      url: `http://localhost:${MAIN_PORT}`,
    };
  }

  const existing = readPortFile(root);
  const port = existing ?? stableWorktreePort(root);

  if (ensure && existing === null) {
    writeMetadata(root, port, branch);
    updateRegistry(mainRepoRoot(root), {
      port,
      path: root,
      branch,
      url: `http://localhost:${port}`,
      assignedAt: new Date().toISOString(),
    });
  }

  return {
    port,
    root,
    branch,
    isWorktree: true,
    url: `http://localhost:${port}`,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/resolve-dev-port.mjs [options]

Options:
  --ensure     Write .worktree-dev-port metadata for this checkout
  --json       Print full metadata as JSON
  --help       Show this help

Main repo uses port ${MAIN_PORT}. Worktrees use ${WORKTREE_BASE}–${
    WORKTREE_BASE + WORKTREE_RANGE - 1
  } based on checkout path.`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const result = resolvePort({ ensure: args.includes("--ensure") });

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(result.port);
}
