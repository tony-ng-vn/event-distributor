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

function stripHtml(text) {
  return String(text)
    .replace(/<[^>]+>/g, "")
    .replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function listPrSlugs(source) {
  if (source.type === "fs") {
    const dir = join(source.root, "prs");
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(
      (slug) =>
        existsSync(join(dir, slug, "explainer.html")) ||
        existsSync(join(dir, slug, "explainer.content.json")),
    );
  }
  try {
    return git(`git ls-tree --name-only "${source.branch}:docs/understanding/prs"`)
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function prExplainerHref(source, slug) {
  return source.isPrimary
    ? `/prs/${slug}/explainer.html`
    : `/all/${source.id}/prs/${slug}/explainer.html`;
}

function loadPrThread(source, slug) {
  const content = readJsonFromSource(source, `prs/${slug}/explainer.content.json`);
  if (!content) return null;

  const prMatch = content.meta?.match(/PR\s*#(\d+)/i);
  return {
    slug,
    threadId: slug,
    prNumber: prMatch ? Number(prMatch[1]) : null,
    title: content.title || slug.replace(/-/g, " "),
    brief: stripHtml(content.glance || content.goal || ""),
    href: prExplainerHref(source, slug),
    source,
  };
}

function collectExplainerThreads() {
  const byKey = new Map();

  for (const source of SOURCES) {
    for (const slug of listPrSlugs(source)) {
      const thread = loadPrThread(source, slug);
      if (!thread) continue;

      const key = thread.prNumber ?? `${slug}:${source.id}`;
      const existing = byKey.get(key);
      const score = (s) =>
        (s.isPrimary ? 4 : 0) + (s.type === "fs" ? 2 : 0) + (s.branch?.startsWith("origin/") ? 0 : 1);
      if (!existing || score(source) > score(existing.source)) {
        byKey.set(key, thread);
      }
    }
  }

  return [...byKey.values()].sort((a, b) => (b.prNumber ?? 0) - (a.prNumber ?? 0));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
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

function renderUnifiedHub() {
  const threads = collectExplainerThreads();

  const cards = threads
    .map((t) => {
      const prLabel = t.prNumber ? `PR #${t.prNumber}` : "PR";
      return `<li class="thread" data-thread-id="${t.threadId}">
        <div class="card">
          <a class="card-link" href="${t.href}">
            <div class="headline">
              <span class="pr">${prLabel}</span>
              <strong class="title">${t.title}</strong>
              <span class="read-badge">Finished</span>
            </div>
            <p class="brief">${t.brief}</p>
          </a>
          <button type="button" class="mark-read">Mark as finished</button>
        </div>
      </li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Understanding workbook</title>
  <style>
    :root { --bg:#faf9f7; --surface:#fff; --text:#1a1a1a; --muted:#5c5c5c; --accent:#2563eb; --border:#e5e2dc; --radius:12px; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text);
      padding: max(1.25rem, env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right)) max(2.5rem, env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left)); max-width: 36rem; }
    h1 { font-size: 1.5rem; margin: 0 0 .5rem; font-weight: 600; }
    .lead { color: var(--muted); line-height: 1.5; margin-bottom: 1.5rem; font-size: .9375rem; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem; }
    .thread .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .thread .card:hover { border-color: #bfdbfe; background: #f8fafc; }
    a.card-link { display: block; text-decoration: none; color: inherit; padding: 1rem 1.125rem 0; }
    .headline { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; flex-wrap: wrap; }
    .pr { flex-shrink: 0; font-size: .75rem; font-weight: 600; color: var(--accent); background: #eff6ff;
      padding: .2rem .5rem; border-radius: 6px; line-height: 1.2; }
    .title { font-size: 1.05rem; font-weight: 600; margin: 0; line-height: 1.35; flex: 1; min-width: 0; }
    .brief { margin: 0 0 1rem; font-size: .9rem; line-height: 1.5; color: var(--muted); }
    .empty { color: var(--muted); font-size: .9rem; line-height: 1.5; }
  </style>
</head>
<body data-understanding-page="workbook">
  <h1>Understanding workbook</h1>
  <p class="lead">One explainer thread per PR. Tap to read. Mark finished when done — saved in this browser.</p>
  <ul>${cards || '<li class="empty">No explainer threads yet. Run the understanding skill bundle after a PR is created.</li>'}</ul>
  <script src="/_assets/understanding-reader.js" data-mode="workbook"></script>
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
  return sendBuffer(res, relPath, buf);
}

function prThreadIdFromPath(relPath) {
  const match = relPath.match(/prs\/([^/]+)\/explainer\.html$/);
  return match ? match[1] : null;
}

function injectExplainerReader(html, relPath) {
  if (!relPath.endsWith(".html")) return html;
  const threadId = prThreadIdFromPath(relPath);
  if (!threadId || html.includes("understanding-reader.js")) return html;
  const tag = `<script src="/_assets/understanding-reader.js" data-mode="explainer" data-thread-id="${threadId}"></script>`;
  return html.replace("</body>", `${tag}\n</body>`);
}

function sendBuffer(res, relPath, buf) {
  const ext = extname(relPath);
  let body = buf;
  if (ext === ".html") {
    const html = buf.toString("utf8");
    body = Buffer.from(injectExplainerReader(html, relPath), "utf8");
  }
  const type = MIME[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  res.end(body);
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
    redirect(res, prExplainerHref(source, allHubMatch[2]));
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
    redirect(res, prExplainerHref(primary, hubMatch[1]));
    return;
  }

  const filePath = safePrimaryPath(url);
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found — try http://127.0.0.1:" + port + "/ for the workbook");
    return;
  }

  const relFromRoot = relative(PRIMARY_ROOT, filePath).replace(/\\/g, "/");
  sendBuffer(res, relFromRoot, readFileSync(filePath));
});

server.listen(port, host, () => {
  const lan = lanAddresses();
  const threads = collectExplainerThreads();

  console.log("\nUnderstanding workbook\n");
  console.log(`  Start here:  http://127.0.0.1:${port}/`);
  for (const ip of lan) {
    console.log(`  On phone:    http://${ip}:${port}/`);
  }

  if (threads.length > 0) {
    console.log("\n  Explainer threads:");
    for (const t of threads) {
      const pr = t.prNumber ? `PR #${t.prNumber}` : "PR";
      console.log(`    · ${pr} — ${t.title}`);
      console.log(`      http://127.0.0.1:${port}${t.href}`);
    }
  }

  console.log("\nGitHub shows HTML source — use this server for interactive explainers.");
  if (!localOnly) {
    console.log("Includes docs from all worktrees and fetched remote branches.");
  }
  console.log("");
});
