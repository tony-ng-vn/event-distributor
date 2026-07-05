# Dogfood: first sample PR explainer

**Commit:** `b744660` · **Tier:** full · **Files:** 4  
**Series:** entry #4 — [reading-order](../../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md)

---

## At a glance

This commit **uses the system on itself** — it adds a sample PR-level explainer (HTML + quiz + index) under `docs/understanding/prs/` so you can see what the finished product looks like before per-commit docs existed.

---

## Background

Commits #1–#3 built skills, rules, and templates. Nothing in the repo yet demonstrated the end result for a human reader.

### What this commit adds

Files under `docs/understanding/prs/cursor-explain-diff-understanding-layer-d250/`:

- `explainer.html` — interactive page with 5-question quiz
- `explainer.md` — markdown twin
- `index.md` — links to commit story (updated in later commits to point at reading-order)
- `diff-context.json` — branch vs `main` diff snapshot

---

## Intuition

**Goal:** Prove the format works — open HTML in a browser, read Background → Intuition → Code, take the quiz.

This is a **PR roll-up** (whole branch story), not a single-commit explainer. Per-commit folders come in *this* testing pass you're reading now.

---

## Code walkthrough

### Step 1 — explainer.html

Self-contained HTML: TOC, sections, quiz buttons with JS feedback, score at end.

### Step 2 — explainer.md

Same narrative for git diffing and search.

### Step 3 — index.md

Entry point for PR reviewers — later commits retarget it to `reading-order.md`.

---

## Quiz

### 1. What type of explainer did this commit add?

- [ ] Per-commit only  
  <details><summary>Reveal</summary>❌ PR roll-up under `docs/understanding/prs/`.</details>
- [ ] PR roll-up for the branch  
  <details><summary>Reveal</summary>✅ Whole-branch story + quiz.</details>
- [ ] Unit test  
  <details><summary>Reveal</summary>❌ Documentation artifact.</details>
- [ ] Git hook  
  <details><summary>Reveal</summary>❌ Static files only.</details>

### 2. Where is the interactive quiz?

- [ ] Only in explainer.md  
  <details><summary>Reveal</summary>❌ HTML has click-to-answer JS.</details>
- [ ] explainer.html with JavaScript  
  <details><summary>Reveal</summary>✅ Open in browser to interact.</details>
- [ ] package.json  
  <details><summary>Reveal</summary>❌ Wrong location.</details>
- [ ] GitHub Actions  
  <details><summary>Reveal</summary>❌ Local static file.</details>

### 3. Why include explainer.md alongside HTML?

- [ ] HTML can't contain text  
  <details><summary>Reveal</summary>❌ MD is git-friendly twin for search/diff.</details>
- [ ] Git-friendly twin for search and diff  
  <details><summary>Reveal</summary>✅ Correct.</details>
- [ ] Legal requirement  
  <details><summary>Reveal</summary>❌ No.</details>
- [ ] MD replaces HTML  
  <details><summary>Reveal</summary>❌ HTML preferred for quiz UX.</details>

### 4. What is diff-context.json in the prs folder?

- [ ] Finished quiz answers  
  <details><summary>Reveal</summary>❌ Machine-readable branch diff summary.</details>
- [ ] Branch vs base diff context for agents  
  <details><summary>Reveal</summary>✅ From understanding-diff.mjs.</details>
- [ ] Lockfile  
  <details><summary>Reveal</summary>❌ JSON diff metadata.</details>
- [ ] Clerk config  
  <details><summary>Reveal</summary>❌ Unrelated.</details>

### 5. Did this commit add per-commit explainers for all branch commits?

- [ ] Yes, complete set  
  <details><summary>Reveal</summary>❌ Only PR roll-up — per-commit filled in later (this test).</details>
- [ ] No — only PR-level sample  
  <details><summary>Reveal</summary>✅ You're generating those now.</details>
- [ ] Yes, in /tmp  
  <details><summary>Reveal</summary>❌ Repo-local paths only.</details>
- [ ] Skipped entirely  
  <details><summary>Reveal</summary>❌ PR sample exists.</details>
