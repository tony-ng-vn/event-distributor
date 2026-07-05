#!/usr/bin/env node
/**
 * Gather diff context for explain-diff skill.
 *
 * Usage:
 *   node scripts/understanding-diff.mjs --commit HEAD
 *   node scripts/understanding-diff.mjs --commit abc1234
 *   node scripts/understanding-diff.mjs --branch my-branch --base main
 */

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const args = { commit: null, branch: null, base: "main", out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--commit") args.commit = argv[++i];
    else if (a === "--branch") args.branch = argv[++i];
    else if (a === "--base") args.base = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  node scripts/understanding-diff.mjs --commit <ref>
  node scripts/understanding-diff.mjs --branch <name> --base <ref>

Writes diff-context.json and prints the suggested explainer directory.`);
      process.exit(0);
    }
  }
  return args;
}

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf8" }).trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function shortSha(ref) {
  return git(`rev-parse --short=7 ${ref}`);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function commitSubject(ref) {
  return git(`log -1 --format=%s ${ref}`);
}

function parentRef(ref) {
  return git(`rev-parse ${ref}^`);
}

function diffRange(from, to) {
  return git(`diff ${from}..${to} --stat`);
}

function diffNames(from, to) {
  return git(`diff ${from}..${to} --name-only`)
    .split("\n")
    .filter(Boolean);
}

function diffPatch(from, to, maxBytes = 120_000) {
  const patch = git(`diff ${from}..${to}`);
  if (patch.length > maxBytes) {
    return patch.slice(0, maxBytes) + "\n\n… [diff truncated for size; use git diff locally] …";
  }
  return patch;
}

function defaultOutDir({ kind, ref, label }) {
  if (kind === "commit") {
    const sha = shortSha(ref);
    const slug = slugify(label);
    return join("docs", "understanding", "commits", `${today()}-${sha}-${slug}`);
  }
  const branchSlug = slugify(label.replace(/\//g, "-"));
  return join("docs", "understanding", "prs", branchSlug);
}

const args = parseArgs(process.argv);

if (!args.commit && !args.branch) {
  console.error("Error: pass --commit <ref> or --branch <name>");
  process.exit(1);
}

let kind;
let from;
let to;
let label;
let ref;

if (args.commit) {
  kind = "commit";
  ref = args.commit;
  to = git(`rev-parse ${ref}`);
  from = parentRef(ref);
  label = commitSubject(ref);
} else {
  kind = "branch";
  ref = args.branch;
  to = git(`rev-parse ${ref}`);
  from = git(`merge-base ${args.base} ${ref}`);
  label = ref;
}

const context = {
  generatedAt: new Date().toISOString(),
  kind,
  ref,
  from,
  to,
  shortSha: shortSha(to),
  subject: kind === "commit" ? label : `Branch ${label} vs ${args.base}`,
  base: kind === "branch" ? args.base : undefined,
  files: diffNames(from, to),
  stat: diffRange(from, to),
  patch: diffPatch(from, to),
  suggestedPaths: {
    explainerHtml: "explainer.html",
    explainerMd: "explainer.md",
    microWorldProposal: "micro-world-proposal.md",
  },
};

const outDir = args.out ?? defaultOutDir({ kind, ref: to, label });
mkdirSync(outDir, { recursive: true });

const outFile = join(outDir, "diff-context.json");
writeFileSync(outFile, JSON.stringify(context, null, 2) + "\n");

console.log(JSON.stringify({
  outDir,
  diffContext: outFile,
  fileCount: context.files.length,
  subject: context.subject,
  hint: "Read diff-context.json, explore files, then write explainer.html + explainer.md using docs/understanding/_templates/",
}, null, 2));
