#!/usr/bin/env node
/**
 * Serve understanding docs over HTTP so phones can view interactive HTML + quizzes.
 *
 * Serves the current worktree AND (by default) all other worktrees + local git
 * branches that have docs/understanding — one URL for everything.
 *
 * Usage:
 *   npm run understanding:serve
 *   npm run understanding:serve -- --port 3456 --host 0.0.0.0
 *   npm run understanding:serve -- --local-only   # skip other worktrees/branches
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, normalize, relative } from "node:path";
import { networkInterfaces } from "node:os";
import { execSync } from "node:child_process";

const CWD = process.cwd();
const PRIMARY_ROOT = join(CWD, "docs", "understanding");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function parseArgs(argv) {
  const args = { port: 3456, host: "0.0.0.0", localOnly: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--host") args.host = argv[++i];
    else if (argv[i] === "--local-only") args.localOnly = true;
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(
        "Usage: npm run understanding:serve [-- --port 3456 --host 0.0.0.0] [--local-only]",
      );
      process.exit(0);
    }
  }
  return args;
}

function git(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd: CWD, stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function branchSlug(branch) {
  return slugify(branch.replace(/^origin\//, ""));
}

function encodeSourceId(branch) {
  return branchSlug(branch);
}

function decodeSourceId(id) {
  return SOURCES.find((s) => s.id === id) ?? null;
}

function currentBranch() {
  try {
    return git("git branch --show-current");
  } catch {
    return "";
  }
}

function listBranchSlugsFromFs(root) {
  const dir = join(root, "branches");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) =>
    existsSync(join(dir, name, "reading-order.md")),
  );
}

function listWorktrees() {
  try {
    const raw = git("git worktree list --porcelain");
    const blocks = raw.split(/\n\n+/).filter(Boolean);
    return blocks
      .map((block) => {
        const path = block.match(/^worktree (.+)$/m)?.[1];
        const branch = block.match(/^branch refs\/heads\/(.+)$/m)?.[1] ?? "";
        if (!path) return null;
        return { path, branch };
      })
      .filter(Boolean);
  } catch {
    return [{ path: CWD, branch: currentBranch() }];
  }
}

function listLocalBranches() {
  try {
    return git('git for-each-ref --format="%(refname:short)" refs/heads/')
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function listRemoteBranches() {
  try {
    return git('git for-each-ref --format="%(refname:short)" refs/remotes/origin/')
      .split("\n")
      .filter((b) => b && b !== "origin/HEAD" && !b.endsWith("/HEAD"));
  } catch {
    return [];
  }
}

function branchHasUnderstanding(branch) {
  try {
    git(`git cat-file -e "${branch}:docs/understanding/branches"`);
    const slugs = git(
      `git ls-tree --name-only "${branch}:docs/understanding/branches"`,
    )
      .split("\n")
      .filter(Boolean);
    return slugs.some((slug) => {
      try {
        git(
          `git cat-file -e "${branch}:docs/understanding/branches/${slug}/reading-order.md"`,
        );
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function discoverSources(localOnly) {
  const sources = [];
  const branchesCovered = new Set();

  const worktrees = listWorktrees();
  for (const wt of worktrees) {
    const root = join(wt.path, "docs", "understanding");
    if (!existsSync(root)) continue;
    const slugs = listBranchSlugsFromFs(root);
    if (slugs.length === 0 && !existsSync(join(root, "commits"))) continue;

    const branch = wt.branch || relative(CWD, wt.path) || "detached";
    const id = encodeSourceId(branch || wt.path);
    branchesCovered.add(branch);

    sources.push({
      id,
      type: "fs",
      branch,
      label: branch || wt.path,
      root,
      worktreePath: wt.path,
      isPrimary: normalize(wt.path) === normalize(CWD),
      slugs,
    });
  }

  if (localOnly) return sources;

  const refsToScan = [
    ...listLocalBranches().map((b) => ({ ref: b, label: b })),
    ...listRemoteBranches().map((b) => ({ ref: b, label: b.replace(/^origin\//, "") })),
  ];

  const gitById = new Map();
  for (const { ref, label } of refsToScan) {
    if (branchesCovered.has(label)) continue;
    if (!branchHasUnderstanding(ref)) continue;

    let slugs = [];
    try {
      slugs = git(`git ls-tree --name-only "${ref}:docs/understanding/branches"`)
        .split("\n")
        .filter((slug) => {
          try {
            git(
              `git cat-file -e "${ref}:docs/understanding/branches/${slug}/reading-order.md"`,
            );
            return true;
          } catch {
            return false;
          }
        });
    } catch {
      continue;
    }

    const id = encodeSourceId(label);
    const existing = gitById.get(id);
    // Prefer local branch ref over origin/ when both exist
    if (!existing || ref.startsWith("origin/") === false) {
      gitById.set(id, {
        id,
        type: "git",
        branch: ref,
        label,
        root: null,
        worktreePath: null,
        isPrimary: false,
        slugs,
      });
    }
  }

  for (const source of gitById.values()) {
    sources.push(source);
  }

  return sources;
}

function readFromSource(source, relPath) {
  const clean = relPath.replace(/^\/+/, "");
  if (source.type === "fs") {
    const abs = join(source.root, clean);
    const rootNorm = normalize(source.root);
    if (!normalize(abs).startsWith(rootNorm) || !existsSync(abs)) return null;
    if (statSync(abs).isDirectory()) return null;
    return readFileSync(abs);
  }

  const gitPath = `docs/understanding/${clean}`;
  try {
    return execSync(`git show "${source.branch}:${gitPath}"`, {
      encoding: "buffer",
      cwd: CWD,
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function readJsonFromSource(source, relPath) {
  const buf = readFromSource(source, relPath);
  if (!buf) return null;
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return null;
  }
}

function lanAddresses() {
  const nets = networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) addrs.push(net.address);
    }
  }
  return addrs;
}

function primarySource() {
  return SOURCES.find((s) => s.isPrimary) ?? SOURCES[0] ?? null;
}

function rewriteExplainerHref(source, explainerPath) {
  if (!explainerPath) return null;
  const rel = explainerPath.replace(/^\.\.\//, "");
  if (source.isPrimary) return `/${rel}`;
  return `/all/${source.id}/${rel}`;
}

function renderUnifiedHub() {
  const current = branchSlug(currentBranch());
  const sections = SOURCES.map((source) => {
    const cards = source.slugs
      .map((slug) => {
        const active =
          source.isPrimary && slug === current
            ? ' <span class="pill">checked out here</span>'
            : "";
        const hub = source.isPrimary
          ? `/branches/${slug}/hub.html`
          : `/all/${source.id}/branches/${slug}/hub.html`;
        return `<li><a class="card" href="${hub}">
          <strong>${slug.replace(/-/g, "/")}</strong>${active}
          <span class="sub">Reading order + explainers</span>
        </a></li>`;
      })
      .join("\n");

    const loc =
      source.type === "fs"
        ? `<span class="meta">${source.worktreePath}</span>`
        : `<span class="meta">${source.branch.startsWith("origin/") ? "remote branch (git fetch)" : "git branch (not checked out)"}</span>`;

    return `<section class="source">
      <h2>${source.label}</h2>
      ${loc}
      <ul>${cards || "<li class=\"empty\">No reading-order yet.</li>"}</ul>
    </section>`;
  }).join("\n");

  const sourceCount = SOURCES.length;
  const branchCount = SOURCES.reduce((n, s) => n + s.slugs.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Understanding layer — all branches</title>
  <style>
    :root { --bg:#faf9f7; --surface:#fff; --text:#1a1a1a; --muted:#5c5c5c; --accent:#2563eb; --border:#e5e2dc; --radius:12px; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text);
      padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); max-width: 40rem; }
    h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
    h2 { font-size: 1rem; margin: 0 0 .35rem; color: var(--text); }
    .lead { color: var(--muted); line-height: 1.5; margin-bottom: 1rem; font-size: .95rem; }
    .stats { font-size: .8125rem; color: var(--muted); margin-bottom: 1.25rem; }
    .callout { background: #fffbeb; border: 1px solid #fcd34d; border-radius: var(--radius); padding: .875rem 1rem; margin-bottom: 1.25rem; font-size: .875rem; line-height: 1.5; }
    .source { margin-bottom: 1.75rem; }
    .meta { display: block; font-size: .75rem; color: var(--muted); margin-bottom: .65rem; word-break: break-all; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .65rem; }
    a.card { display: block; text-decoration: none; color: inherit; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: .875rem 1rem; min-height: 44px; }
    a.card strong { display: block; font-size: .95rem; margin-bottom: .2rem; }
    .sub { color: var(--muted); font-size: .8125rem; }
    .pill { display: inline-block; font-size: .6875rem; background: #eff6ff; color: var(--accent); padding: .15rem .45rem; border-radius: 999px; margin-left: .35rem; }
    .empty { color: var(--muted); font-size: .875rem; }
  </style>
</head>
<body>
  <h1>Understanding layer</h1>
  <p class="lead">One place for every branch and worktree. Pick a reading order — no git checkout needed.</p>
  <p class="stats">${sourceCount} source(s) · ${branchCount} reading order(s)</p>
  <div class="callout"><strong>Phone?</strong> Use the LAN URL from your terminal (same Wi‑Fi). GitHub shows HTML source — this server runs the quiz.</div>
  ${sections || "<p>No understanding docs found. Run <code>npm run understanding:index</code> on a branch.</p>"}
</body>
</html>`;
}

function renderBranchHub(source, slug) {
  const index = readJsonFromSource(source, `branches/${slug}/index.json`);
  const entries = index?.entries ?? [];

  const items = entries
    .map((e) => {
      const href = rewriteExplainerHref(source, e.explainerPath);
      const read = href
        ? `<a class="go" href="${href}">Read explainer →</a>`
        : e.tier === "skip"
          ? `<span class="skip">Skipped</span>`
          : `<span class="pending">Pending</span>`;
      return `<li class="entry">
        <div class="num">#${e.sequence}</div>
        <div class="body">
          <div class="title"><code>${e.sha}</code> · ${e.tier}</div>
          <div class="summary">${e.summary}</div>
          ${read}
        </div>
      </li>`;
    })
    .join("\n");

  const rollup = source.isPrimary
    ? `/prs/${slug}/explainer.html`
    : `/all/${source.id}/prs/${slug}/explainer.html`;
  const back = source.isPrimary ? "/" : "/";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Reading order — ${slug}</title>
  <style>
    :root { --bg:#faf9f7; --surface:#fff; --text:#1a1a1a; --muted:#5c5c5c; --accent:#2563eb; --border:#e5e2dc; --radius:12px; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text);
      padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); }
    a { color: var(--accent); }
    h1 { font-size: 1.35rem; margin: 0 0 .35rem; }
    .back { display: inline-block; margin-bottom: 1rem; font-size: .875rem; text-decoration: none; min-height: 44px; line-height: 44px; }
    .lead { color: var(--muted); font-size: .9rem; margin-bottom: 1rem; line-height: 1.5; }
    .rollup { display: block; text-align: center; text-decoration: none; color: inherit; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: .875rem; margin-bottom: 1.25rem; font-weight: 600; min-height: 44px; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem; }
    .entry { display: flex; gap: .75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: .875rem 1rem; }
    .num { font-weight: 700; color: var(--accent); min-width: 2rem; font-size: 1.1rem; }
    .title { font-size: .8125rem; margin-bottom: .25rem; }
    .summary { font-size: .9rem; line-height: 1.45; margin-bottom: .5rem; }
    a.go { display: inline-block; font-size: .9375rem; font-weight: 600; text-decoration: none; padding: .5rem 0; min-height: 44px; line-height: 1.2; }
    .skip, .pending { font-size: .8125rem; color: var(--muted); }
    .src { font-size: .75rem; color: var(--muted); margin-bottom: .5rem; }
  </style>
</head>
<body>
  <a class="back" href="${back}">← All branches</a>
  <p class="src">${source.label}</p>
  <h1>${slug}</h1>
  <p class="lead">Read <strong>#1 → #${entries.length || "?"}</strong> in order (oldest first).</p>
  <a class="rollup" href="${rollup}">PR roll-up (whole branch)</a>
  <ul>${items}</ul>
</body>
</html>`;
}

function safePrimaryPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = join(PRIMARY_ROOT, rel);
  if (!abs.startsWith(normalize(PRIMARY_ROOT))) return null;
  return abs;
}

function serveStaticFromSource(source, relPath, res) {
  const buf = readFromSource(source, relPath);
  if (!buf) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return true;
  }
  const ext = extname(relPath);
  const type = MIME[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  res.end(buf);
  return true;
}

const { port, host, localOnly } = parseArgs(process.argv);
const SOURCES = discoverSources(localOnly);

const server = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderUnifiedHub());
    return;
  }

  const allHubMatch = url.match(/^\/all\/([^/]+)\/branches\/([^/]+)\/hub\.html$/);
  if (allHubMatch) {
    const source = decodeSourceId(allHubMatch[1]);
    if (!source) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Unknown source");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderBranchHub(source, allHubMatch[2]));
    return;
  }

  const allFileMatch = url.match(/^\/all\/([^/]+)\/(.+)$/);
  if (allFileMatch) {
    const source = decodeSourceId(allFileMatch[1]);
    if (!source) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Unknown source");
      return;
    }
    serveStaticFromSource(source, allFileMatch[2], res);
    return;
  }

  const hubMatch = url.match(/^\/branches\/([^/]+)\/hub\.html$/);
  if (hubMatch) {
    const primary = primarySource();
    if (!primary) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("No primary source");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderBranchHub(primary, hubMatch[1]));
    return;
  }

  const filePath = safePrimaryPath(url);
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found — try http://127.0.0.1:" + port + "/ for all branches");
    return;
  }

  const ext = extname(filePath);
  const type = MIME[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  res.end(readFileSync(filePath));
});

server.listen(port, host, () => {
  const lan = lanAddresses();
  console.log("\nUnderstanding docs server (all branches)\n");
  console.log(`  Catalog (start here):  http://127.0.0.1:${port}/`);
  for (const ip of lan) {
    console.log(`  On your phone:           http://${ip}:${port}/`);
  }

  if (SOURCES.length > 0) {
    console.log("\n  Sources:");
    for (const s of SOURCES) {
      const tag = s.isPrimary
        ? " ← you are here"
        : s.type === "git"
          ? s.branch.startsWith("origin/")
            ? " (remote)"
            : " (git only)"
          : "";
      console.log(`    · ${s.label}${tag}`);
      for (const slug of s.slugs) {
        const hub = s.isPrimary
          ? `http://127.0.0.1:${port}/branches/${slug}/hub.html`
          : `http://127.0.0.1:${port}/all/${s.id}/branches/${slug}/hub.html`;
        console.log(`        ${slug}`);
        console.log(`        ${hub}`);
      }
    }
  }

  console.log("\nGitHub PR links show HTML source — use this server for quizzes.");
  if (!localOnly) {
    console.log("Serving all worktrees + local branches with understanding docs.");
  }
  console.log("");
});
