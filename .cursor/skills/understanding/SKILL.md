---
name: understanding
description: >-
  Run the full understanding task once per PR: classify commits, write per-commit
  explainers (full or light; skip trivial), maintain reading order, optional
  micro-worlds, PR roll-up, and human checkpoint. Invoke after PR creation —
  not during every implementation commit.
---

# Understanding (skill bundle)

One **understanding task** runs the whole pipeline — not three separate skills
you have to remember. This bundle orchestrates:

| Module | File |
|--------|------|
| Commit size & tier policy | [commit-policy.md](./commit-policy.md) |
| Literate diff + quiz | [explain-diff.md](./explain-diff.md) |
| Hands-on micro-worlds | [micro-world.md](./micro-world.md) |
| Incremental reading order | [reading-order.md](./reading-order.md) |
| Human checkpoints | [checkpoints.md](./checkpoints.md) |

**Invoke when:**

- A **pull request is created or updated** and the feature is production-ready (see `feature-goal-workflow.mdc`).
- The human asks to understand / review a branch.
- You are about to pause for human input after finishing a PR's understanding pass.

**Do not** run during implementation commits. **Do not** rely on a background rule firing after every `git commit`. Run this bundle deliberately as a **per-PR** understanding task.

---

## The understanding task (checklist)

Work through these steps in order. Skip steps only when the reason is obvious
(e.g. no new commits since last run).

### 1. Gather context

```bash
# Current branch
git branch --show-current

# Rebuild machine-readable index + reading order
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
```

Read `docs/understanding/branches/<branch-slug>/index.json` — it lists every
commit on the branch, suggested tier (`skip` | `light` | `full`), and whether an
explainer already exists.

### 2. Classify commits

Apply [commit-policy.md](./commit-policy.md) to each commit **without** an
explainer yet. The index script pre-suggests tiers; you confirm or override with
a one-line reason in `meta.json` inside the commit folder (or in reading order).

**Goal:** fewer, better docs — not one essay per typo.

### 3. Write explainers

For each commit classified `light` or `full`:

```bash
npm run understanding:diff -- --commit <sha>
```

Then write docs in the suggested folder:

| Tier | Output | Sections |
|------|--------|----------|
| **full** | `explainer.html` + `explainer.md` | Background → Intuition → Code → Quiz (5 Q) |
| **light** | `explainer.md` only (HTML optional) | At a glance → Intuition → Code (brief) → Quiz (2 Q) |
| **skip** | No folder required | Listed in reading order as skipped with reason |

Follow [explain-diff.md](./explain-diff.md) for prose quality. Use
`docs/understanding/_templates/`.

### 4. Micro-world proposals (selective)

For **full** explainers where hands-on learning would help, add
`micro-world-proposal.md` per [micro-world.md](./micro-world.md). Build only after
the human picks an option.

### 5. Update reading order

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
```

Verify `docs/understanding/branches/<branch-slug>/reading-order.md` — commits
appear in **chronological order** with sequence numbers. This is the human's
primary navigation aid when there are many commits.

### 6. PR roll-up (when branch is ready)

```bash
npm run understanding:diff -- --branch "$(git branch --show-current)" --base main
```

Write `docs/understanding/prs/<branch-slug>/explainer.html` + `explainer.md`.
Link every per-commit entry from `reading-order.md` in `index.md`. Add **Review
guide** to the PR description.

### 7. Checkpoint handoff

Follow [checkpoints.md](./checkpoints.md). Tell the human:

- Where to start reading (`reading-order.md`, entry #N).
- What tier was skipped and why.
- Whether you are **paused** or **continuing**.

---

## Commit hygiene (best effort)

Agents are non-deterministic. You cannot guarantee perfect commit sizes, but
**try**:

- One logical concern per commit (see `incremental-commits` rule).
- Batch trivial fixes instead of 10 micro-commits when possible.
- Use `[skip-understanding]` in the commit message only for truly trivial commits
  (typos, format-only, lockfile-only).

If many small commits slip through, **reading order still makes the story
linear** — the human reads in order and skips entries marked `skip`.

---

## Quick reference

```bash
# Full understanding pass on current branch
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
# → then write missing explainers per index.json tiers
# → then re-run index to refresh reading-order.md

# Single commit
npm run understanding:diff -- --commit <sha>

# PR roll-up
npm run understanding:diff -- --branch <branch> --base main
```

## Principles (unchanged)

- Plain language; define jargon on first use.
- Background → intuition → code.
- Quiz verifies comprehension (`full`: 5 Q, `light`: 2 Q, `skip`: none).
- Many docs are OK if **reading order** is clear.
