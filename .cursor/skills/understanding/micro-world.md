# Micro-world (module)

Part of the **understanding** skill bundle. Optional hands-on playgrounds —
propose first, build after the human chooses.

Inspired by Seymour Papert's *Mathland*.

## When to propose

- Non-obvious **runtime behavior** (state machines, parsers, async).
- Human **unfamiliar with a framework**.
- Migration/refactor hard to review statically.
- Full-tier explainer quiz would be easier after 5 minutes of play.

**Do not** propose for every commit. Skip for `light` and `skip` tiers unless the
human asks.

## Workflow

1. Write `micro-world-proposal.md` (2–3 options) in the commit's understanding folder.
2. Human picks, says skip, or asks for a variant.
3. Build smallest useful version in `micro-world/`.
4. Link from explainer; add 2 quiz questions about what the toy teaches.

See parent [SKILL.md](./SKILL.md) step 4.

## Form factors

| Form | Best for |
|------|----------|
| Step-through debugger | Algorithms, parsers, rule engines |
| Command center | Migrations, framework ports |
| Toy API playground | Endpoints, auth, data shaping |
| UI sandbox | Components, interaction states |
| Trace replay | Pipelines, ingest flows |

## Rules

- Self-contained HTML when possible (`micro-world/index.html`).
- Dev-only routes — never unsafe controls in production.
- Reuse `tests/fixtures/` when available.
- No new npm packages without human approval.

Reusable forms → `docs/understanding/_patterns/` after human confirms.

Full proposal template and examples: see the previous standalone content in git
history or `micro-world-proposal.md` in any commit folder.
