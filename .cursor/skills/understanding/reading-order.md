# Reading order (module)

Part of the **understanding** skill bundle. When there are many commits, the
human must know **what to read, in what order** — without guessing from folder
names or git log.

## Canonical file

```
docs/understanding/branches/<branch-slug>/reading-order.md
```

Example: branch `cursor/feature-d250` → `docs/understanding/branches/cursor-feature-d250/reading-order.md`

Regenerate with:

```bash
npm run understanding:index -- --branch <branch> --base main
```

Run after writing or skipping explainers so the table stays current.

---

## Table format

Commits appear in **chronological order** (oldest at top = read first).

```markdown
# Reading order — cursor/feature-d250

**Start here** if you're catching up on this branch. Read top → bottom.

| # | Commit | Tier | Summary | Read |
|---|--------|------|---------|------|
| 1 | `64f3c9a` | full | Add feed filter schema | [explainer](../commits/2026-07-02-64f3c9a-add-feed-filter/explainer.html) |
| 2 | `a1b2c3d` | skip | Fix typo in README `[skip-understanding]` | — |
| 3 | `cc1f952` | light | Wire filter to API query | [explainer](../commits/2026-07-02-cc1f952-wire-filter/explainer.md) |
```

### Column rules

| Column | Rule |
|--------|------|
| **#** | Sequential 1…N across the branch; never restart mid-branch |
| **Commit** | 7-char SHA |
| **Tier** | `full` · `light` · `skip` |
| **Summary** | Commit subject; include skip tag if present |
| **Read** | Link to `explainer.html` (prefer) or `explainer.md`; `—` for skip |

---

## Companion files

| File | Purpose |
|------|---------|
| `index.json` | Machine-readable list (for agents) |
| `README.md` | One-line pointer: "Open reading-order.md" |

PR roll-up `docs/understanding/prs/<branch>/index.md` should **embed or link**
the same ordered table so PR review matches branch review.

---

## Many docs is OK

The user accepts a large number of commit explainers during long agent runs.
**Clarity of order matters more than count.**

Help the human navigate:

- At checkpoint, say: *"New since last checkpoint: entries #4–#6 in reading-order.md"*
- At PR, say: *"Full story: reading-order.md (12 entries, 3 skipped, 9 to read)"*
- Mark skipped commits so gaps in sequence numbers do not look like mistakes

---

## Commit folder naming

Still use: `docs/understanding/commits/YYYY-MM-DD-<sha>-<slug>/`

The reading-order table links into these folders. Slug comes from commit subject.

Optional `meta.json` per folder:

```json
{
  "sha": "64f3c9a",
  "tier": "full",
  "tierReason": "schema + RLS",
  "sequence": 1
}
```

The index script fills `sequence` when regenerating.
