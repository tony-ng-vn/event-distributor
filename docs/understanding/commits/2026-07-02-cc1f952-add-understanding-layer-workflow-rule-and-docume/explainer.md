# Workflow rule: explain after every commit (v1)

**Commit:** `cc1f952` · **Tier:** full · **Files:** 5  
**Series:** entry #2 — [reading-order](../../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md)

---

## At a glance

This commit wires the understanding layer into daily agent behavior: an **always-on Cursor rule** requiring explainers after each commit, plus human-facing docs describing the layout.

*(Note: commit #5 later removes the mandatory per-commit rule in favor of the skill bundle — read this to understand the first iteration.)*

---

## Background

Skills tell agents *how* to write explainers. **Rules** tell them *when* — Cursor loads rules marked `alwaysApply: true` into every session.

### What mattered before

Commit #1 added skills but agents might ignore them without enforcement.

---

## Intuition

**Goal:** Make teaching docs as automatic as committing — at least in theory.

```
code change → git commit → explain-diff → docs/understanding/commits/...
```

Also documents where files live so humans know where to look.

---

## Code walkthrough

### Step 1 — `understanding-layer.mdc` rule

Always applied. Steps after each focused commit:

1. Commit
2. Run `understanding-diff.mjs`
3. Write `explainer.html` + `explainer.md`
4. Mandatory quiz

### Step 2 — Hook into incremental commits

`.cursor/rules/incremental-commits.mdc` gains step 5: "Explain" before push.

### Step 3 — Documentation

- `docs/agents/understanding-layer.md` — design doc for agents
- `docs/understanding/README.md` — quick navigation
- `docs/understanding/_patterns/README.md` — placeholder for reusable micro-world forms

---

## Quiz

### 1. What makes `understanding-layer.mdc` different from a skill?

- [ ] Skills are always applied; rules are optional  
  <details><summary>Reveal</summary>❌ This rule uses `alwaysApply: true`.</details>
- [ ] Rules with `alwaysApply` load every session; skills are read when relevant  
  <details><summary>Reveal</summary>✅ Rules enforce timing; skills teach method.</details>
- [ ] Rules are only for humans  
  <details><summary>Reveal</summary>❌ Agents read both.</details>
- [ ] There is no difference  
  <details><summary>Reveal</summary>❌ Different mechanisms in Cursor.</details>

### 2. Where do per-commit explainers live?

- [ ] `/tmp`  
  <details><summary>Reveal</summary>❌ Versioned in repo under `docs/understanding/commits/`.</details>
- [ ] `docs/understanding/commits/<date>-<sha>-<slug>/`  
  <details><summary>Reveal</summary>✅ Correct path pattern.</details>
- [ ] `.cursor/rules/`  
  <details><summary>Reveal</summary>❌ Rules are instructions, not output.</details>
- [ ] `src/`  
  <details><summary>Reveal</summary>❌ Docs only.</details>

### 3. What did this commit add to incremental-commits?

- [ ] Remove commit step  
  <details><summary>Reveal</summary>❌ It adds explain step.</details>
- [ ] Step 5: run explain-diff after verify  
  <details><summary>Reveal</summary>✅ Links commit workflow to explainers.</details>
- [ ] Automatic git hook  
  <details><summary>Reveal</summary>❌ Still agent-guided.</details>
- [ ] PR roll-up only  
  <details><summary>Reveal</summary>❌ Per-commit was the focus.</details>

### 4. What is `_patterns/` for?

- [ ] Git commit templates  
  <details><summary>Reveal</summary>❌ Reusable micro-world forms humans approve.</details>
- [ ] Reusable micro-world patterns  
  <details><summary>Reveal</summary>✅ Store forms worth repeating.</details>
- [ ] ADRs  
  <details><summary>Reveal</summary>❌ ADRs live in `docs/adr/`.</details>
- [ ] Test fixtures  
  <details><summary>Reveal</summary>❌ Different purpose.</details>

### 5. Is the always-on per-commit rule still active at the end of this PR?

- [ ] Yes, unchanged  
  <details><summary>Reveal</summary>❌ Commit #6 deletes `understanding-layer.mdc`.</details>
- [ ] No — later replaced by skill bundle + checkpoints  
  <details><summary>Reveal</summary>✅ Read commits #5–#6 for the evolution.</details>
- [ ] Never existed  
  <details><summary>Reveal</summary>❌ This commit creates it.</details>
- [ ] Moved to package.json  
  <details><summary>Reveal</summary>❌ Deleted, not relocated.</details>
