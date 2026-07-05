#!/usr/bin/env node
/**
 * Render explainer.html from explainer.content.json in a commit/PR folder.
 * Usage: node scripts/render-explainer-html.mjs --dir docs/understanding/commits/...
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseArgs(argv) {
  let dir = null;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dir") dir = argv[++i];
  }
  if (!dir) {
    console.error("Usage: node scripts/render-explainer-html.mjs --dir <folder>");
    process.exit(1);
  }
  return { dir };
}

function renderQuiz(quiz) {
  return quiz
    .map((item, qi) => {
      const opts = item.options
        .map(
          (o, oi) =>
            `              <button type="button" data-index="${oi}">${esc(o)}</button>`,
        )
        .join("\n");
      const fb = item.feedback
        .map((f, oi) => `            <div class="quiz-feedback" data-feedback="${oi}">${esc(f)}</div>`)
        .join("\n");
      return `          <div class="quiz-item" data-correct="${item.correct}">
            <p class="question">${qi + 1}. ${esc(item.q)}</p>
            <div class="quiz-options">
${opts}
            </div>
${fb}
          </div>`;
    })
    .join("\n");
}

function renderSteps(steps) {
  return steps
    .map(
      (s, i) => `        <div class="code-step">
          <div class="step-label">Step ${i + 1} — ${esc(s.label)}</div>
          <p>${s.body}</p>
          ${s.pre ? `<pre>${esc(s.pre)}</pre>` : ""}
        </div>`,
    )
    .join("\n");
}

const { dir } = parseArgs(process.argv);
const configPath = join(dir, "explainer.content.json");
if (!existsSync(configPath)) {
  console.error(`Missing ${configPath}`);
  process.exit(1);
}

const c = JSON.parse(readFileSync(configPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(c.title)}</title>
  <style>
    :root { --bg:#faf9f7; --surface:#fff; --text:#1a1a1a; --muted:#5c5c5c; --accent:#2563eb; --accent-soft:#eff6ff; --border:#e5e2dc; --ok:#15803d; --ok-bg:#f0fdf4; --bad:#b91c1c; --bad-bg:#fef2f2; --callout:#fffbeb; --callout-border:#fcd34d; --radius:10px; --font:Georgia,serif; --mono:ui-monospace,Menlo,monospace; }
    *{box-sizing:border-box} body{margin:0;font-family:var(--font);font-size:1.0625rem;line-height:1.65;color:var(--text);background:var(--bg);padding:max(1.25rem,env(safe-area-inset-top)) max(1.25rem,env(safe-area-inset-right)) max(4rem,env(safe-area-inset-bottom)) max(1.25rem,env(safe-area-inset-left))}
    .layout{display:grid;max-width:44rem;margin:0 auto;padding:1.25rem 1.25rem 4rem}
    @media(min-width:900px){.layout{grid-template-columns:11rem 1fr;gap:2.5rem;max-width:56rem;padding-top:2rem} nav.toc{position:sticky;top:1.5rem;align-self:start}}
    nav.toc{font-size:.8125rem;margin-bottom:1.5rem} nav.toc strong{display:block;font-size:.6875rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:.5rem}
    nav.toc a{display:block;color:var(--muted);text-decoration:none;padding:.2rem 0} nav.toc a:hover{color:var(--accent)}
    header.hero{margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--border)}
    header.hero h1{font-size:1.75rem;font-weight:600;letter-spacing:-.02em;margin:0 0 .75rem} .meta{font-size:.875rem;color:var(--muted)}
    section{margin-bottom:2.5rem} h2{font-size:1.35rem;font-weight:600;margin:0 0 1rem} h3{font-size:1.05rem;font-weight:600;margin:1.5rem 0 .5rem}
    p{margin:0 0 1rem} details.deep-bg{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:.75rem 1rem;margin-bottom:1rem}
    details.deep-bg summary{cursor:pointer;font-weight:600;color:var(--muted)} .figure{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;margin:1.25rem 0}
    .flow{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font-size:.875rem} .flow .box{background:var(--accent-soft);border:1px solid #bfdbfe;border-radius:6px;padding:.4rem .65rem;font-family:var(--mono);font-size:.75rem}
    .flow .arrow{color:var(--muted)} pre{font-family:var(--mono);background:#1e1e1e;color:#d4d4d4;padding:1rem;border-radius:var(--radius);font-size:.8125rem;white-space:pre-wrap;margin:1rem 0}
    .code-step{margin:1.5rem 0} .code-step .step-label{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);font-weight:600;margin-bottom:.35rem}
    .quiz-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.125rem;margin-bottom:1rem}
    .quiz-item p.question{font-weight:600;margin-bottom:.75rem} .quiz-options{display:flex;flex-direction:column;gap:.5rem}
    .quiz-options button{text-align:left;font-family:inherit;font-size:.9375rem;padding:.75rem .85rem;min-height:44px;border:1px solid var(--border);border-radius:8px;background:var(--bg);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
    .quiz-options button:hover:not(:disabled){border-color:var(--accent);background:var(--accent-soft)} .quiz-options button:disabled{cursor:default}
    .quiz-options button.correct{border-color:var(--ok);background:var(--ok-bg)} .quiz-options button.incorrect{border-color:var(--bad);background:var(--bad-bg)}
    .quiz-feedback{margin-top:.75rem;font-size:.9375rem;display:none} .quiz-feedback.visible{display:block}
    .quiz-score{margin-top:1.5rem;padding:1rem;background:var(--accent-soft);border-radius:var(--radius);font-weight:600;display:none} .quiz-score.visible{display:block}
    .series-link{font-size:.875rem;color:var(--accent)}
  </style>
</head>
<body>
  <div class="layout">
    <nav class="toc"><strong>Contents</strong>
      <a href="#glance">At a glance</a><a href="#background">Background</a><a href="#intuition">Intuition</a><a href="#code">Code</a><a href="#quiz">Quiz</a>
    </nav>
    <main>
      <header class="hero">
        <h1>${esc(c.title)}</h1>
        <p class="meta">${esc(c.meta)}<br>Generated ${today}. Read <a href="#intuition">Intuition</a> first.${c.seriesLink ? ` <a class="series-link" href="${c.seriesLink}">Reading order →</a>` : ""}</p>
      </header>
      <section id="glance"><h2>At a glance</h2><p>${c.glance}</p></section>
      <section id="background"><h2>Background</h2>
        ${c.backgroundDeep ? `<details class="deep-bg"><summary>Deep background (skippable)</summary><p>${c.backgroundDeep}</p></details>` : ""}
        <h3>What mattered before</h3><p>${c.backgroundNarrow}</p>
      </section>
      <section id="intuition"><h2>Intuition</h2><p><strong>Goal:</strong> ${esc(c.goal)}</p>
        ${c.figure ? `<div class="figure"><div class="flow">${c.figure}</div></div>` : ""}
        <p>${c.intuition}</p>
      </section>
      <section id="code"><h2>Code walkthrough</h2>${c.codeIntro ? `<p>${c.codeIntro}</p>` : ""}
${renderSteps(c.steps || [])}
      </section>
      <section id="quiz"><h2>Quiz</h2><p>Five questions — click an answer for feedback.</p>
        <div id="quiz-root">
${renderQuiz(c.quiz)}
          <div class="quiz-score" id="quiz-score" aria-live="polite"></div>
        </div>
      </section>
    </main>
  </div>
  <script>
    (function(){const items=document.querySelectorAll(".quiz-item");const answered=new Set();
    items.forEach(function(item,qIndex){const correct=Number(item.dataset.correct);const buttons=item.querySelectorAll(".quiz-options button");const feedbacks=item.querySelectorAll(".quiz-feedback");
    buttons.forEach(function(btn){btn.addEventListener("click",function(){if(answered.has(qIndex))return;answered.add(qIndex);const chosen=Number(btn.dataset.index);
    buttons.forEach(function(b){b.disabled=true;const idx=Number(b.dataset.index);if(idx===correct)b.classList.add("correct");else if(idx===chosen)b.classList.add("incorrect");});
    feedbacks.forEach(function(fb){if(Number(fb.dataset.feedback)===chosen)fb.classList.add("visible");});
    if(answered.size===items.length){let score=0;items.forEach(function(it){const corr=Number(it.dataset.correct);
    it.querySelectorAll(".quiz-options button").forEach(function(b){if(b.classList.contains("correct")&&Number(b.dataset.index)===corr)score++;});});
    const el=document.getElementById("quiz-score");el.textContent="You got "+score+" / "+items.length+".";el.classList.add("visible");}});});});})();
  </script>
</body>
</html>
`;

writeFileSync(join(dir, "explainer.html"), html);
console.log(`Wrote ${join(dir, "explainer.html")}`);
