#!/usr/bin/env node
/**
 * Copy shared local config from the main repo into a git worktree.
 *
 * Always copies .env.local and .env from main → worktree so each worktree
 * can run immediately without manual env setup.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";

const COPY_PATHS = [".env.local", ".env"];
const OPTIONAL_PATHS = [".insforge"];
const REQUIRED_PATH = ".env.local";

function runGit(args, cwd) {
  return execSync(`git ${args.join(" ")}`, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitRoot(cwd = process.cwd()) {
  return runGit(["rev-parse", "--show-toplevel"], cwd);
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

function copySharedPath(name, mainRoot, worktreeRoot) {
  const source = resolve(mainRoot, name);
  const target = resolve(worktreeRoot, name);

  if (!existsSync(source)) {
    return { name, status: "missing-source", source };
  }

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });

  return { name, status: "copied", source, target };
}

function hasEnvLocal(worktreeRoot) {
  return existsSync(resolve(worktreeRoot, REQUIRED_PATH));
}

function hasEnvExample(mainRoot) {
  return existsSync(resolve(mainRoot, ".env.example"));
}

function printFixSteps({ mainRoot, worktreeRoot }) {
  console.log("");
  console.error("Setup incomplete — .env.local is still missing in the worktree.");
  console.error("");
  console.error("Create credentials in the main repo first:");
  console.error(`  cd ${mainRoot}`);
  if (hasEnvExample(mainRoot)) {
    console.error("  cp .env.example .env.local   # add Clerk + InsForge keys");
  } else {
    console.error("  Create .env.local with Clerk + InsForge keys");
  }
  console.error(`  cd ${worktreeRoot}`);
  console.error("  npm run worktree:setup");
}

function setupWorktree() {
  const worktreeRoot = gitRoot();
  const mainRoot = mainRepoRoot(worktreeRoot);

  if (!isWorktreeCheckout(worktreeRoot)) {
    return {
      ok: false,
      ready: false,
      error: "Not a git worktree checkout. Run this from .worktrees/<name>/",
      worktreeRoot,
      mainRoot,
      results: [],
    };
  }

  const results = [];
  for (const name of [...COPY_PATHS, ...OPTIONAL_PATHS]) {
    results.push(copySharedPath(name, mainRoot, worktreeRoot));
  }

  const ready = hasEnvLocal(worktreeRoot);

  return {
    ok: ready,
    ready,
    worktreeRoot,
    mainRoot,
    results,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/setup-worktree.mjs [options]

Copy shared local config from the main repo into this worktree:
  .env.local, .env (required)
  .insforge (optional, if present in main)

Options:
  --json    Print result as JSON
  --help    Show this help`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const result = setupWorktree();

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.log(`Main repo:   ${result.mainRoot}`);
console.log(`Worktree:    ${result.worktreeRoot}`);
console.log("");

for (const item of result.results) {
  switch (item.status) {
    case "copied":
      console.log(`✓ copied ${item.name} from main repo`);
      break;
    case "missing-source":
      console.log(`✗ ${item.name} not found in main repo (${item.source})`);
      break;
    default: {
      const neverStatus = item.status;
      console.log(`? ${item.name}: ${neverStatus}`);
      break;
    }
  }
}

if (result.ready) {
  console.log("");
  console.log("Worktree is ready. Start the dev server with: npm run dev:worktree");
  process.exit(0);
}

printFixSteps(result);
process.exit(1);
