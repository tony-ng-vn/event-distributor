# Understanding layer

Teaching documents for agent-written code.

## Understanding workbook

Run one server — open one page — pick a PR:

```bash
git fetch origin
npm run understanding:serve
```

```text
http://127.0.0.1:3456/
```

Each card shows:

1. **PR number** (e.g. PR #3)
2. **Thread title** (same name as the PR explainer)
3. **Brief** — one sentence about what the explainer covers

Tap a card → read the full interactive explainer (quiz included).

The server finds explainers across **all worktrees and branches** — no checkout needed.

## View on your phone

**GitHub will not work** for interactive explainers (`.html` opens as source code).

Use the LAN URL from your terminal (same Wi‑Fi), e.g. `http://192.168.1.42:3456/`

## Agents

Run the **`understanding` skill bundle**: `.cursor/skills/understanding/SKILL.md`

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
npm run understanding:serve
```

Each PR roll-up needs `prs/<branch-slug>/explainer.content.json` with:

| Field | Used for |
|-------|----------|
| `title` | Thread name in the workbook |
| `meta` | PR number (`PR #3 · …`) |
| `glance` | Brief summary on the card |
