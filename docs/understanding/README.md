# Understanding layer

Teaching documents for agent-written code.

## One server for everything (worktrees + branches)

Run **one** server from any worktree (usually `main`). It automatically lists understanding docs from:

- **This worktree** (files on disk)
- **Other git worktrees** on the same repo
- **Local and remote branches** that have `docs/understanding/` (via `git show` — no checkout needed)

```bash
git fetch origin    # pull in remote PR branches
npm run understanding:serve
```

Open the **catalog**:

```text
http://127.0.0.1:3456/
```

Pick any branch / PR from the list — no switching worktrees or checking out branches.

| URL | What |
|-----|------|
| `/` | **Catalog** — all worktrees + branches |
| `/branches/<slug>/hub.html` | Current worktree reading order |
| `/all/<branch-slug>/branches/<slug>/hub.html` | Another branch (no checkout) |
| `/all/<branch-slug>/commits/.../explainer.html` | Explainer from another branch |

Example (PR #3 from `main` after `git fetch`):

```text
http://127.0.0.1:3456/all/cursor-fix-event-persistence-0847/commits/2026-07-05-87f4c9d-fix-event-feed-dropping-events-after-24-hours/explainer.html
```

Use `--local-only` to serve only the current worktree (old behavior).

## View on your phone (important)

**GitHub will not work** for the interactive explainers. On GitHub (desktop or mobile), `.html` files open as **source code** — the quiz JavaScript does not run.

**Use the local server** (same Wi‑Fi as your computer):

```bash
npm run understanding:serve
```

Then on your phone, open the **LAN URL** printed in the terminal, e.g.:

```text
http://192.168.1.42:3456/
```

Tap a branch in the catalog → read entries **#1, #2, …** in order → open each explainer.

On laptop only: `http://127.0.0.1:3456/` also works.

## Where to read (incremental order)

**Open your branch's reading order** — commits listed oldest-first:

```text
docs/understanding/branches/<branch-slug>/reading-order.md
```

Example: `docs/understanding/branches/cursor-explain-diff-understanding-layer-d250/reading-order.md`

| Column | Meaning |
|--------|---------|
| **#** | Read in this order |
| **Tier** | `full` · `light` · `skip` |
| **Read** | Link to explainer, `—` if skipped, `*(pending)*` if not written yet |

Many commits → many docs is fine. **Order is what matters.**

## Other paths

| I want to… | Open |
|------------|------|
| PR roll-up | `prs/<branch-slug>/explainer.html` (via `understanding:serve`) |
| Full-tier template | `_templates/explainer.html` |
| Light-tier template | `_templates/explainer-light.md` |
| Micro-world ideas | `commits/.../micro-world-proposal.md` |

## Agents

Run the **`understanding` skill bundle**: `.cursor/skills/understanding/SKILL.md`

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
npm run understanding:serve   # tell human the catalog URL
```

Not every commit gets an explainer — see commit policy in the skill bundle.
