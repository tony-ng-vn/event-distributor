# Understanding layer

Teaching documents for agent-written code — one folder per commit and per PR.

## Quick start

| I want to… | Open |
|------------|------|
| Understand the latest commit | `commits/` — newest dated folder |
| Review a whole branch | `prs/<branch-slug>/explainer.html` |
| Copy the HTML scaffold | `_templates/explainer.html` |
| See micro-world ideas | `commits/.../micro-world-proposal.md` |

## Conventions

**Folder names**

- Commits: `YYYY-MM-DD-<7-char-sha>-<kebab-slug>`
- PRs: branch name with slashes replaced by `-` (e.g. `cursor-feature-d250`)

**Files**

- `explainer.html` — full interactive doc (preferred for reading)
- `explainer.md` — same content, git-friendly
- `diff-context.json` — output of `scripts/understanding-diff.mjs` (for agents)

## Agents

Read `docs/agents/understanding-layer.md` and use the `explain-diff` skill after each commit.
