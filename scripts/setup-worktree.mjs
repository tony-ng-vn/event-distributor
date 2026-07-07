#!/usr/bin/env node
/**
 * Link shared local config from the main repo into a git worktree.
 *
 * Prefer symlinks over copies — credentials stay in one place and update
 * automatically when the main checkout changes.
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

const SHARED_PATHS = [".env.local", ".env", ".insforge"];
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

function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function isRealPath(path) {
  return existsSync(path) && !isSymlink(path);
}

function bootstrapToMain(name, mainRoot, worktreeRoot) {
  const source = resolve(worktreeRoot, name);
  const target = resolve(mainRoot, name);

  if (!isRealPath(source) || existsSync(target)) {
    return { name, status: "bootstrap-skipped", source, target };
  }

  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  return { name, status: "bootstrapped", source, target };
}

function linkSharedPath(name, mainRoot, worktreeRoot, { force = false } = {}) {
  const source = resolve(mainRoot, name);
  const target = resolve(worktreeRoot, name);

  if (!existsSync(source)) {
    return { name, status: "missing-source", source };
  }

  if (existsSync(target)) {
    if (isSymlink(target)) {
      const current = readlinkSync(target);
      const expected = relative(dirname(target), source);
      if (current === expected || resolve(dirname(target), current) === source) {
        return { name, status: "already-linked", target, source };
      }
    }

    if (!force) {
      return { name, status: "exists", target, source };
    }
  }

  if (existsSync(target) && force) {
    if (isSymlink(target)) unlinkSync(target);
    else rmSync(target, { recursive: true, force: true });
  }

  const parent = dirname(target);
  mkdirSync(parent, { recursive: true });

  const linkTarget = relative(parent, source);
  symlinkSync(
    linkTarget,
    target,
    lstatSync(source).isDirectory() ? "dir" : "file",
  );

  return { name, status: "linked", target, source, linkTarget };
}

function hasEnvLocal(worktreeRoot) {
  return existsSync(resolve(worktreeRoot, REQUIRED_PATH));
}

function printFixSteps({ mainRoot, worktreeRoot, bootstrap = false }) {
  console.log("");
  console.error("Setup incomplete — .env.local is still missing in the worktree.");
  console.error("");
  console.error("Fix (recommended):");
  console.error(`  1. cd ${mainRoot}`);
  console.error("  2. cp .env.example .env.local   # add Clerk + InsForge keys");
  console.error(`  3. cd ${worktreeRoot}`);
  console.error("  4. npm run worktree:setup");
  console.error("");
  if (!bootstrap) {
    console.error("Already copied .env.local into the worktree?");
    console.error("  npm run worktree:setup -- --bootstrap");
  }
}

function setupWorktree(options = {}) {
  const worktreeRoot = gitRoot();
  const mainRoot = mainRepoRoot(worktreeRoot);
  const force = options.force === true;
  const bootstrap = options.bootstrap === true;

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

  if (bootstrap) {
    for (const name of SHARED_PATHS) {
      results.push(bootstrapToMain(name, mainRoot, worktreeRoot));
    }
  }

  for (const name of SHARED_PATHS) {
    results.push(linkSharedPath(name, mainRoot, worktreeRoot, { force }));
  }

  const ready = hasEnvLocal(worktreeRoot);

  return {
    ok: ready,
    ready,
    worktreeRoot,
    mainRoot,
    results,
    bootstrap,
  };
}

function printHelp() {
  console.log(`Usage: node scripts/setup-worktree.mjs [options]

Link shared local config from the main repo into this worktree:
  .env.local, .env, .insforge

Options:
  --bootstrap  Copy existing worktree files to main, then link back
  --json       Print result as JSON
  --force      Replace existing worktree files with symlinks
  --help       Show this help

Prefer symlinks over copies so credentials stay in one place.`);
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const result = setupWorktree({
  force: args.includes("--force"),
  bootstrap: args.includes("--bootstrap"),
});

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

console.log(`Main repo:   ${result.mainRoot}`);
console.log(`Worktree:    ${result.worktreeRoot}`);
console.log("");

for (const item of result.results) {
  switch (item.status) {
    case "linked":
      console.log(`✓ linked ${item.name} → ${item.linkTarget}`);
      break;
    case "already-linked":
      console.log(`✓ ${item.name} already linked`);
      break;
    case "exists":
      console.log(`• ${item.name} already exists in worktree (left unchanged)`);
      break;
    case "bootstrapped":
      console.log(`✓ bootstrapped ${item.name} to main repo`);
      break;
    case "bootstrap-skipped":
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
