# Understanding layer

Teaching documents for agent-written code.

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

Tap your branch → read entries **#1, #2, …** in order → open each explainer.

| URL | What |
|-----|------|
| `/` | Branch picker (mobile-friendly) |
| `/branches/<slug>/hub.html` | Reading order with big tap targets |
| `/commits/.../explainer.html` | Interactive quiz |

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
npm run understanding:serve   # tell human the phone URL
```

Not every commit gets an explainer — see commit policy in the skill bundle.
