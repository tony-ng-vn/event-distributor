#!/usr/bin/env node
/**
 * Serve understanding docs over HTTP so phones can view interactive HTML + quizzes.
 *
 * GitHub shows .html as source code (no JS). file:// on laptop isn't reachable from phone.
 *
 * Usage:
 *   npm run understanding:serve
 *   npm run understanding:serve -- --port 3456 --host 0.0.0.0
 */

import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { networkInterfaces } from "node:os";
import { execSync } from "node:child_process";

const ROOT = join(process.cwd(), "docs", "understanding");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function parseArgs(argv) {
  const args = { port: 3456, host: "0.0.0.0" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--port") args.port = Number(argv[++i]);
    else if (argv[i] === "--host") args.host = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") {
      console.log(`Usage: npm run understanding:serve [-- --port 3456 --host 0.0.0.0]`);
      process.exit(0);
    }
  }
  return args;
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

function currentBranchSlug() {
  try {
    const branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    return branch.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  } catch {
    return null;
  }
}

function listBranches() {
  const dir = join(ROOT, "branches");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => existsSync(join(dir, name, "reading-order.md")));
}

function renderHub() {
  const branches = listBranches();
  const current = currentBranchSlug();
  const branchLinks = branches
    .map((slug) => {
      const label = slug.replace(/-/g, "/");
      const active = slug === current ? " <span class=\"pill\">current branch</span>" : "";
      return `<li><a class="card" href="/branches/${slug}/hub.html">
        <strong>${label}</strong>${active}
        <span class="sub">Reading order + explainers</span>
      </a></li>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Understanding layer</title>
  <style>
    :root { --bg:#faf9f7; --surface:#fff; --text:#1a1a1a; --muted:#5c5c5c; --accent:#2563eb; --border:#e5e2dc; --radius:12px; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text);
      padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(2rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); }
    h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
    .lead { color: var(--muted); line-height: 1.5; margin-bottom: 1.5rem; font-size: .95rem; }
    .callout { background: #fffbeb; border: 1px solid #fcd34d; border-radius: var(--radius); padding: .875rem 1rem; margin-bottom: 1.25rem; font-size: .875rem; line-height: 1.5; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .75rem; }
    a.card { display: block; text-decoration: none; color: inherit; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1rem 1.125rem; min-height: 44px; }
    a.card strong { display: block; font-size: 1rem; margin-bottom: .25rem; }
    .sub { color: var(--muted); font-size: .8125rem; }
    .pill { display: inline-block; font-size: .6875rem; background: #eff6ff; color: var(--accent); padding: .15rem .45rem; border-radius: 999px; margin-left: .35rem; vertical-align: middle; }
  </style>
</head>
<body>
  <h1>Understanding layer</h1>
  <p class="lead">Interactive explainers and quizzes. Pick a branch — read entries in order.</p>
  <div class="callout"><strong>Phone?</strong> Use the LAN URL printed in your terminal (same Wi‑Fi as this computer). GitHub links won’t run the quiz.</div>
  <ul>${branchLinks || "<li>No branches yet. Run <code>npm run understanding:index</code>.</li>"}</ul>
</body>
</html>`;
}

function renderBranchHub(slug) {
  const indexPath = join(ROOT, "branches", slug, "index.json");
  let entries = [];
  if (existsSync(indexPath)) {
    try {
      entries = JSON.parse(readFileSync(indexPath, "utf8")).entries ?? [];
    } catch {
      /* ignore */
    }
  }

  const items = entries
    .map((e) => {
      const href = e.explainerPath
        ? e.explainerPath.replace(/^\.\.\//, "/")
        : null;
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

  const prHref = `/prs/${slug}/explainer.html`;

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
  </style>
</head>
<body>
  <a class="back" href="/">← All branches</a>
  <h1>${slug}</h1>
  <p class="lead">Read <strong>#1 → #${entries.length}</strong> in order (oldest first).</p>
  <a class="rollup" href="${prHref}">PR roll-up (whole branch)</a>
  <ul>${items}</ul>
</body>
</html>`;
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = join(ROOT, rel);
  if (!abs.startsWith(ROOT)) return null;
  return abs;
}

const { port, host } = parseArgs(process.argv);

const server = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderHub());
    return;
  }

  const hubMatch = url.match(/^\/branches\/([^/]+)\/hub\.html$/);
  if (hubMatch) {
    const slug = hubMatch[1];
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderBranchHub(slug));
    return;
  }

  const filePath = safePath(url);
  if (!filePath || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const ext = extname(filePath);
  const type = MIME[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  res.end(readFileSync(filePath));
});

server.listen(port, host, () => {
  const lan = lanAddresses();
  console.log("\nUnderstanding docs server\n");
  console.log(`  On this machine:  http://127.0.0.1:${port}/`);
  for (const ip of lan) {
    console.log(`  On your phone:    http://${ip}:${port}/  (same Wi‑Fi)`);
  }
  const cur = currentBranchSlug();
  if (cur && existsSync(join(ROOT, "branches", cur))) {
    console.log(`\n  Current branch:   http://127.0.0.1:${port}/branches/${cur}/hub.html`);
    for (const ip of lan) {
      console.log(`                    http://${ip}:${port}/branches/${cur}/hub.html`);
    }
  }
  console.log("\nGitHub PR links show HTML source — use this server for quizzes.\n");
});
