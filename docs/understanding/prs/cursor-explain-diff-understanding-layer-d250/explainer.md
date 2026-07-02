# Understanding layer for agent-written code

**Scope:** branch `cursor/explain-diff-understanding-layer-d250` vs `main` · 13 files · risk: low  
**Generated:** 2026-07-02  
**If you only read one section, read [Intuition](#intuition).**

---

## At a glance

This PR adds an **understanding layer** so you can review agent code incrementally: literate explainers, embedded quizzes, and optional micro-worlds — one doc per commit and a roll-up per PR.

---

## Background

### Deep background (skip if familiar)

When an AI agent works on a feature for a long time, it may touch many files across several commits. A raw `git diff` lists files alphabetically and shows `+`/`-` lines without telling you *why* or *how pieces connect*. It is easy to skim and think you understood when you did not — Andy Matuschak calls this the "books don't work" problem.

An **understanding layer** is teaching material the agent writes *alongside* the code: plain-language background, intuition-first explanations, a narrative code walkthrough, and a short quiz so you can verify you actually got it.

### What mattered before this change

This repo already had:

- **Incremental commits** (`.cursor/rules/incremental-commits.mdc`) — small, focused commits.
- **Agent skills** in `AGENTS.md` — mostly InsForge/backend skills installed globally.
- **HTML review docs** under `docs/ui-review/` — static prototypes, not tied to git history.

What was missing: a repeatable process and templates for *per-commit* and *per-PR* teaching docs tied to diffs.

---

## Intuition

**Goal:** After every agent commit, you get a short "lesson" about that slice of work; at PR time you get a map of the whole story.

Think of it as three layers:

1. **Literate diff** (`explain-diff` skill) — reads like an essay, walks code in sensible order.
2. **Quiz** — five multiple-choice questions; you click an answer and get immediate feedback (spaced-repetition style, inspired by Geoffrey Litt's [explain-diff gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)).
3. **Micro-world** (`explain-micro-world` skill) — optional playground where you *do* the thing (step debugger, command center, toy API). Agent proposes; you pick; then it builds.

```
  Agent commits code slice
           │
           ▼
  node scripts/understanding-diff.mjs --commit HEAD
           │
           ▼
  docs/understanding/commits/<date>-<sha>-<slug>/
     ├── explainer.html  (read in browser)
     ├── explainer.md   (searchable twin)
     └── micro-world-proposal.md (optional)
           │
           ▼ (when PR ready)
  docs/understanding/prs/<branch>/explainer.html
```

---

## Code walkthrough

### Step 1 — Agent skills define *how* to teach

Two skills live under `.cursor/skills/`:

- **`explain-diff`** — principles (plain language, background → intuition → code), section structure, quiz rules, output paths.
- **`explain-micro-world`** — when to propose playgrounds, proposal template, form factors (step-through, command center, toy API, etc.).

Agents read these before generating docs.

### Step 2 — Cursor rules enforce *when* to teach

- **`understanding-layer.mdc`** (always applied) — after each commit, run explain-diff; at PR time, roll up.
- **`incremental-commits.mdc`** — new step 5: explain after verify.

### Step 3 — Templates and helper script

- `docs/understanding/_templates/explainer.html` — self-contained page with TOC, callouts, diagram primitives, interactive quiz JS.
- `docs/understanding/_templates/explainer.md` — Markdown twin with toggle-style quiz.
- `scripts/understanding-diff.mjs` — runs `git diff`, writes `diff-context.json`, prints suggested output folder.

```bash
npm run understanding:diff -- --commit HEAD
npm run understanding:diff -- --branch my-branch --base main
```

### Step 4 — Human-facing docs

- `docs/agents/understanding-layer.md` — full design doc for agents and reviewers.
- `docs/understanding/README.md` — quick navigation for humans.
- `docs/understanding/_patterns/` — placeholder for reusable micro-world forms you approve over time.

### Step 5 — AGENTS.md registration

`AGENTS.md` now lists `explain-diff` and `explain-micro-world` at the top so agents discover them early.

---

## Quiz

### 1. When should an agent generate a commit-level explainer?

- [ ] Only when the human asks at the end of a feature  
  <details><summary>Reveal</summary>❌ The whole point is incremental understanding during long runs, not a batch at the end.</details>
- [ ] After every focused commit, before moving to the next slice  
  <details><summary>Reveal</summary>✅ The understanding-layer rule ties explainers to incremental commits.</details>
- [ ] Only for PRs with more than 10 files changed  
  <details><summary>Reveal</summary>❌ Small commits compound; explainers are per commit, not gated by file count.</details>
- [ ] Never — raw git diff is enough  
  <details><summary>Reveal</summary>❌ This PR exists because raw diffs are hard to retain and verify.</details>

### 2. What is the correct section order in a literate diff?

- [ ] Code → Quiz → Background → Intuition  
  <details><summary>Reveal</summary>❌ Code before intuition assumes context the reader may not have.</details>
- [ ] Background → Intuition → Code → Quiz  
  <details><summary>Reveal</summary>✅ Background catches the reader up; intuition builds the mental model; then code; quiz verifies.</details>
- [ ] Quiz → Code → Background  
  <details><summary>Reveal</summary>❌ Quizzing before teaching does not help comprehension.</details>
- [ ] Alphabetical by filename  
  <details><summary>Reveal</summary>❌ That is raw diff order, which literate diffs explicitly avoid.</details>

### 3. What does `scripts/understanding-diff.mjs` produce?

- [ ] It auto-writes explainer.html using an LLM  
  <details><summary>Reveal</summary>❌ It only gathers git diff context; the agent writes the prose.</details>
- [ ] A `diff-context.json` file and a suggested output directory  
  <details><summary>Reveal</summary>✅ It packages stat, file list, and patch for the agent to read before writing.</details>
- [ ] A micro-world HTML game  
  <details><summary>Reveal</summary>❌ Micro-worlds are a separate skill and human-approved step.</details>
- [ ] A Notion page  
  <details><summary>Reveal</summary>❌ Output is repo-local under docs/understanding/.</details>

### 4. When should an agent build a micro-world?

- [ ] Automatically for every commit  
  <details><summary>Reveal</summary>❌ Propose first; build only after the human picks an option.</details>
- [ ] When hands-on exploration would help; after human chooses a proposal  
  <details><summary>Reveal</summary>✅ Collaboration loop: propose 2–3 options, human iterates, then build.</details>
- [ ] Never — micro-worlds are out of scope  
  <details><summary>Reveal</summary>❌ They are optional but first-class in the design.</details>
- [ ] Only for frontend CSS changes  
  <details><summary>Reveal</summary>❌ They also help parsers, migrations, APIs, and pipelines.</details>

### 5. Where do commit explainers live?

- [ ] `/tmp/YYYY-MM-DD-*.html` outside the repo  
  <details><summary>Reveal</summary>❌ Geoffrey's gist used /tmp; this repo versions explainers for reviewers.</details>
- [ ] `docs/understanding/commits/<date>-<sha>-<slug>/`  
  <details><summary>Reveal</summary>✅ Versioned with the repo so PR reviewers can follow commit-by-commit.</details>
- [ ] Only in the PR description comment  
  <details><summary>Reveal</summary>❌ Too easy to lose; needs durable paths.</details>
- [ ] `.cursor/skills/` next to SKILL.md  
  <details><summary>Reveal</summary>❌ Skills are instructions; explainers are generated artifacts.</details>

---

## Micro-world

For this meta PR, reading the templates is enough. A future micro-world could be a tiny page that runs `understanding-diff.mjs` on a sample commit and previews the folder layout — propose if you want it.

- **Proposal:** skip for now (documentation-only change)
