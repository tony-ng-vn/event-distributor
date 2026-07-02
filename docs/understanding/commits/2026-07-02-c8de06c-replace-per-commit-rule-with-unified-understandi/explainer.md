# Unified `understanding` skill bundle

**Commit:** `c8de06c` · **Tier:** full · **Files:** 8  
**Series:** entry #5 — [reading-order](../../branches/cursor-explain-diff-understanding-layer-d250/reading-order.md)

---

## At a glance

Replaces two standalone skills with one **`understanding` skill bundle** — a folder of modules the agent runs as a single "understanding task." Old skill paths become short stubs that point here.

---

## Background

Commits #1–#4 gave: skills, mandatory per-commit rule, templates, sample PR doc. Problems emerged:

- Too many separate skills to remember
- Mandatory explain after *every* commit doesn't scale for fast agent runs
- Need commit size policy and reading order

### What mattered before

`explain-diff` and `explain-micro-world` were full standalone skills. `understanding-layer.mdc` forced per-commit explainers.

---

## Intuition

**Goal:** One entry point — run the **understanding task** checklist when the human wants review or at checkpoints.

```
.cursor/skills/understanding/
├── SKILL.md           ← orchestrator (start here)
├── commit-policy.md   ← skip / light / full
├── explain-diff.md    ← how to write
├── micro-world.md     ← optional playgrounds
├── reading-order.md   ← incremental navigation
└── checkpoints.md     ← pause vs continue
```

Standalone skills shrink to deprecation stubs.

---

## Code walkthrough

### Step 1 — Main SKILL.md

Seven-step checklist: index → classify → write explainers → micro-world proposals → refresh reading order → PR roll-up → checkpoint handoff.

### Step 2 — commit-policy.md

| Tier | When |
|------|------|
| skip | ≤15 LOC mechanical, `[skip-understanding]` |
| light | Small but real — short md + 2 quiz Q |
| full | Substantive — html + md + 5 quiz Q |

### Step 3 — checkpoints.md

- **pause** — hand off reading order, stop
- **continue** — update docs, keep coding
- **pr** — include roll-up

### Step 4 — Stub old skills

`explain-diff/SKILL.md` and `explain-micro-world/SKILL.md` now redirect to the bundle.

---

## Quiz

### 1. What replaced separate explain-diff + explain-micro-world invocations?

- [ ] A git hook  
  <details><summary>Reveal</summary>❌ Still agent-invoked skill bundle.</details>
- [ ] The `understanding` skill bundle  
  <details><summary>Reveal</summary>✅ One checklist runs the pipeline.</details>
- [ ] GitHub Actions  
  <details><summary>Reveal</summary>❌ Local skills.</details>
- [ ] Nothing — deleted features  
  <details><summary>Reveal</summary>❌ Moved into modules.</details>

### 2. When should the understanding task run?

- [ ] Automatically on every git commit via hook  
  <details><summary>Reveal</summary>❌ Deliberately invoked — not a hook.</details>
- [ ] At checkpoints or when human asks to review  
  <details><summary>Reveal</summary>✅ Plus substantive work and PR time.</details>
- [ ] Once per year  
  <details><summary>Reveal</summary>❌ Per checkpoint/PR.</details>
- [ ] Never  
  <details><summary>Reveal</summary>❌ Core workflow.</details>

### 3. What are the three commit tiers?

- [ ] small / medium / large  
  <details><summary>Reveal</summary>❌ skip / light / full.</details>
- [ ] skip / light / full  
  <details><summary>Reveal</summary>✅ Defined in commit-policy.md.</details>
- [ ] none / some / all  
  <details><summary>Reveal</summary>❌ Wrong names.</details>
- [ ] read / skim / ignore  
  <details><summary>Reveal</summary>❌ Those are human actions.</details>

### 4. What does pause mode do?

- [ ] Deletes commits  
  <details><summary>Reveal</summary>❌ Points human to reading-order and stops.</details>
- [ ] Hands off reading order and stops for human  
  <details><summary>Reveal</summary>✅ Checkpoint handoff.</details>
- [ ] Pushes to main  
  <details><summary>Reveal</summary>❌ Unrelated.</details>
- [ ] Skips all explainers  
  <details><summary>Reveal</summary>❌ Still runs understanding task first.</details>

### 5. Did this commit remove understanding-layer.mdc?

- [ ] Yes, deleted immediately  
  <details><summary>Reveal</summary>❌ Deletion is commit #6.</details>
- [ ] No — removed in the next commit  
  <details><summary>Reveal</summary>✅ c8de06c creates bundle; 16922f7 deletes rule.</details>
- [ ] Never existed  
  <details><summary>Reveal</summary>❌ Created in commit #2.</details>
- [ ] Merged into package.json  
  <details><summary>Reveal</summary>❌ Deleted in #6.</details>
