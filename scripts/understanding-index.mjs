#!/usr/bin/env node
/**
 * Build branch reading order and classify commits for the understanding bundle.
 *
 * Usage:
 *   node scripts/understanding-index.mjs --branch my-branch --base main
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const GENERATED_SKIP = [
  /^package-lock\.json$/,
  /\.snap$/,
  /^prisma\/migrations\/.*\/migration\.sql$/,
];

function parseArgs(argv) {
  const args = { branch: null, base: "main" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--branch") args.branch = argv[++i];
    else if (a === "--base") args.base = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  node scripts/understanding-index.mjs --branch <name> --base <ref>

Writes docs/understanding/branches/<branch-slug>/index.json and reading-order.md`);
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
    .slice(0, 64);
}

function shortSha(ref) {
  return git(`rev-parse --short=7 ${ref}`);
}

function branchSlug(name) {
  return slugify(name.replace(/\//g, "-"));
}

function listCommits(base, branch) {
  const mergeBase = git(`merge-base ${base} ${branch}`);
  const lines = git(`log --reverse --format=%H%x09%s ${mergeBase}..${branch}`)
    .split("\n")
    .filter(Boolean);
  return lines.map((line) => {
    const [fullSha, ...rest] = line.split("\t");
    const subject = rest.join("\t");
    return { fullSha, sha: fullSha.slice(0, 7), subject };
  });
}

function commitLineStats(parent, commit) {
  const numstat = git(`diff --numstat ${parent}..${commit}`);
  let lines = 0;
  let files = 0;
  let onlySkippable = true;

  if (!numstat) return { lines: 0, files: 0, onlySkippable: true };

  for (const row of numstat.split("\n")) {
    if (!row.trim()) continue;
    const [add, del, file] = row.split("\t");
    if (add === "-" || del === "-") continue;
    files += 1;
    lines += Number(add) + Number(del);
    if (!GENERATED_SKIP.some((re) => re.test(file))) {
      onlySkippable = false;
    }
  }
  return { lines, files, onlySkippable };
}

function suggestTier({ subject, lines, files, onlySkippable }) {
  if (/\[skip-understanding\]/i.test(subject)) {
    return { tier: "skip", reason: "commit message tag" };
  }
  if (onlySkippable && files > 0) {
    return { tier: "skip", reason: "generated or lockfile-only" };
  }
  if (lines <= 15 && files <= 2) {
    const chore = /^(chore|style)(\(|:)/i.test(subject) || /typo|format|lint/i.test(subject);
    if (chore) return { tier: "skip", reason: "small mechanical change" };
  }
  if (lines <= 80 && files <= 3) {
    return { tier: "light", reason: `${lines} lines, ${files} file(s)` };
  }
  return { tier: "full", reason: `${lines} lines, ${files} file(s)` };
}

function findCommitsRoot() {
  return join("docs", "understanding", "commits");
}

function findExplainerForSha(sha) {
  const root = findCommitsRoot();
  if (!existsSync(root)) return null;

  for (const dir of readdirSync(root)) {
    if (!dir.includes(sha)) continue;
    const base = join(root, dir);
    const html = join(base, "explainer.html");
    const md = join(base, "explainer.md");
    const metaPath = join(base, "meta.json");

    let tier = null;
    if (existsSync(metaPath)) {
      try {
        tier = JSON.parse(readFileSync(metaPath, "utf8")).tier ?? null;
      } catch {
        /* ignore */
      }
    }

    if (existsSync(html)) {
      return { dir, path: `../commits/${dir}/explainer.html`, format: "html", tier };
    }
    if (existsSync(md)) {
      return { dir, path: `../commits/${dir}/explainer.md`, format: "md", tier };
    }
  }
  return null;
}

function renderReadingOrder(branch, entries) {
  const lines = [
    `# Reading order — ${branch}`,
    "",
    "**Start here** when catching up on this branch. Read top → bottom (oldest first).",
    "",
    "| # | Commit | Tier | Summary | Read |",
    "|---|--------|------|---------|------|",
  ];

  for (const e of entries) {
    const link =
      e.explainerPath != null
        ? `[explainer](${e.explainerPath})`
        : e.tier === "skip"
          ? "—"
          : "*(pending)*";
    lines.push(`| ${e.sequence} | \`${e.sha}\` | ${e.tier} | ${e.summary.replace(/\|/g, "\\|")} | ${link} |`);
  }

  const full = entries.filter((e) => e.tier === "full").length;
  const light = entries.filter((e) => e.tier === "light").length;
  const skip = entries.filter((e) => e.tier === "skip").length;
  const pending = entries.filter((e) => e.tier !== "skip" && !e.explainerPath).length;

  lines.push(
    "",
    `**Summary:** ${entries.length} commits · ${full} full · ${light} light · ${skip} skipped · ${pending} explainer(s) pending`,
    "",
    "Regenerate: `npm run understanding:index -- --branch \"$(git branch --show-current)\" --base main`",
  );

  return lines.join("\n") + "\n";
}

const args = parseArgs(process.argv);
const branch = args.branch ?? git("branch --show-current");

if (!branch) {
  console.error("Error: could not determine branch; pass --branch");
  process.exit(1);
}

const slug = branchSlug(branch);
const outDir = join("docs", "understanding", "branches", slug);
mkdirSync(outDir, { recursive: true });

const commits = listCommits(args.base, branch);
const entries = [];

for (const c of commits) {
  const parent = git(`rev-parse ${c.fullSha}^`);
  const stats = commitLineStats(parent, c.fullSha);
  const suggested = suggestTier({ subject: c.subject, ...stats });
  const explainer = findExplainerForSha(c.sha);

  const tier = explainer?.tier ?? suggested.tier;
  const entry = {
    sequence: entries.length + 1,
    sha: c.sha,
    fullSha: c.fullSha,
    summary: c.subject,
    tier,
    tierSuggested: suggested.tier,
    tierReason: suggested.reason,
    linesChanged: stats.lines,
    filesChanged: stats.files,
    explainerDir: explainer?.dir ?? null,
    explainerPath: explainer?.path ?? null,
    explainerFormat: explainer?.format ?? null,
    needsExplainer: tier !== "skip" && !explainer,
  };
  entries.push(entry);
}

const index = {
  generatedAt: new Date().toISOString(),
  branch,
  branchSlug: slug,
  base: args.base,
  commitCount: entries.length,
  pendingExplainers: entries.filter((e) => e.needsExplainer).map((e) => e.sha),
  entries,
};

writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
writeFileSync(join(outDir, "reading-order.md"), renderReadingOrder(branch, entries));
writeFileSync(
  join(outDir, "README.md"),
  `# Branch understanding — ${branch}\n\nOpen **[reading-order.md](./reading-order.md)** — read entries top to bottom.\n\nMachine index: [index.json](./index.json)\n`,
);

console.log(
  JSON.stringify(
    {
      outDir,
      commitCount: entries.length,
      pendingExplainers: index.pendingExplainers,
      readingOrder: join(outDir, "reading-order.md"),
      hint: "Write missing explainers for pending SHAs, then re-run this script.",
    },
    null,
    2,
  ),
);
