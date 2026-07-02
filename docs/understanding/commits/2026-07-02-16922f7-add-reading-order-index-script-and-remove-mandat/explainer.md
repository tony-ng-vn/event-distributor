# Reading-order index script + end of mandatory per-commit rule

**Commit:** `16922f7` · **Tier:** full · **Files:** 13  
**Series:** entry #6 (latest) — [reading-order](../../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md)

---

## At a glance

Adds `understanding-index.mjs` to build **`reading-order.md`** — the human's main navigation when many commits produce many docs. Deletes the always-on per-commit rule. Adds light-tier template.

---

## Background

The skill bundle (commit #5) described reading order conceptually. This commit automates it and removes the rigid rule that fired after every commit.

### The navigation problem

Ten commits → ten explainers. Without a numbered table, you don't know where to start. **Reading order** fixes that: always read entry #1, then #2, … top to bottom (oldest first).

---

## Intuition

**Goal:** `npm run understanding:index` scans branch commits, suggests skip/light/full tiers, links existing explainers, marks pending ones.

```
git log on branch  →  index.json + reading-order.md
                           ↓
              human opens reading-order.md, starts at #1
```

Trivial commits show as `skip` with `—` in the Read column — gaps don't look like mistakes.

---

## Code walkthrough

### Step 1 — `scripts/understanding-index.mjs`

- Lists commits `merge-base..branch` in chronological order
- Computes line/file stats per commit
- Suggests tier (skip/light/full) using heuristics + `[skip-understanding]` tag
- Finds existing explainers in `docs/understanding/commits/` by SHA
- Writes:
  - `docs/understanding/branches/<slug>/index.json`
  - `docs/understanding/branches/<slug>/reading-order.md`
  - `README.md` pointer

### Step 2 — Delete `understanding-layer.mdc`

No more mandatory explain-after-every-commit rule.

### Step 3 — Update incremental-commits

Points to understanding skill bundle at checkpoints instead.

### Step 4 — `explainer-light.md` template

For **light** tier: shorter sections, 2 quiz questions.

### Step 5 — Docs refresh

`AGENTS.md`, `understanding-layer.md`, `docs/understanding/README.md` updated for new workflow.

---

## Quiz

### 1. What is the primary human navigation file?

- [ ] git log  
  <details><summary>Reveal</summary>❌ reading-order.md per branch.</details>
- [ ] docs/understanding/branches/<branch>/reading-order.md  
  <details><summary>Reveal</summary>✅ Numbered table, oldest first.</details>
- [ ] package.json  
  <details><summary>Reveal</summary>❌ Wrong file.</details>
- [ ] .env.local  
  <details><summary>Reveal</summary>❌ Secrets — never.</details>

### 2. What npm command regenerates reading order?

- [ ] understanding:diff  
  <details><summary>Reveal</summary>❌ Gathers patch for one commit/branch.</details>
- [ ] understanding:index  
  <details><summary>Reveal</summary>✅ Added in this commit.</details>
- [ ] npm test  
  <details><summary>Reveal</summary>❌ Unrelated.</details>
- [ ] npm run build  
  <details><summary>Reveal</summary>❌ Unrelated.</details>

### 3. How are skipped commits shown in reading order?

- [ ] Omitted entirely  
  <details><summary>Reveal</summary>❌ Listed with tier `skip` and `—` link.</details>
- [ ] Row with tier skip and — in Read column  
  <details><summary>Reveal</summary>✅ Sequence stays clear.</details>
- [ ] Deleted from git  
  <details><summary>Reveal</summary>❌ Commits remain; docs skipped.</details>
- [ ] Hidden in HTML only  
  <details><summary>Reveal</summary>❌ Visible in markdown table.</details>

### 4. What tag skips an explainer in commit message?

- [ ] [WIP]  
  <details><summary>Reveal</summary>❌ [skip-understanding].</details>
- [ ] [skip-understanding]  
  <details><summary>Reveal</summary>✅ Forces skip tier.</details>
- [ ] [no quiz]  
  <details><summary>Reveal</summary>❌ Not defined.</details>
- [ ] FIXES #  
  <details><summary>Reveal</summary>❌ GitHub syntax, unrelated.</details>

### 5. What happened to understanding-layer.mdc in this commit?

- [ ] Created  
  <details><summary>Reveal</summary>❌ Deleted.</details>
- [ ] Deleted  
  <details><summary>Reveal</summary>✅ Mandatory per-commit rule removed.</details>
- [ ] Unchanged  
  <details><summary>Reveal</summary>❌ Removed.</details>
- [ ] Moved to skills  
  <details><summary>Reveal</summary>❌ Deleted; bundle replaces it.</details>
