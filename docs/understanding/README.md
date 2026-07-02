# Understanding layer

Teaching documents for agent-written code.

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
| PR roll-up | `prs/<branch-slug>/explainer.html` |
| Full-tier template | `_templates/explainer.html` |
| Light-tier template | `_templates/explainer-light.md` |
| Micro-world ideas | `commits/.../micro-world-proposal.md` |

## Agents

Run the **`understanding` skill bundle**: `.cursor/skills/understanding/SKILL.md`

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
```

Not every commit gets an explainer — see commit policy in the skill bundle.
