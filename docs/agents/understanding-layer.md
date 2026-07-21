# Understanding layer

How humans stay in the loop while agents ship code — explainers, quizzes, micro-worlds, and a clear **reading order**.

## Problem

Long agent runs produce many commits. Raw `git diff` is hard to review. You need teaching docs — but not an essay for every typo, and not docs scattered across every WIP commit.

## Solution

One **`pr-explainers` skill** runs the full pipeline **once per pull request** (after the feature is production-ready):

| Step | What |
|------|------|
| Classify commits | `skip` · `light` · `full` per [commit policy](../../.cursor/skills/pr-explainers/commit-policy.md) |
| Write explainers | Literate diff + quiz for light/full only |
| Reading order | Chronological table so many docs stay navigable |
| Micro-worlds | Optional; propose → human picks → build |
| PR roll-up | Branch story + links to per-commit docs |
| Checkpoint | Pause for human review |

## Feature workflow (goal method)

Understanding is the **last** step. See [feature-workflow.md](./feature-workflow.md) and `.cursor/rules/feature-goal-workflow.mdc`:

```
implement → sub-agent review loop until green → create PR → understanding layer
```

## Start here (humans)

```text
docs/understanding/branches/<your-branch>/reading-order.md
```

Read **top → bottom** (oldest commit first). Skipped commits appear as `—` so the sequence stays clear.

## Start here (agents)

Read `.cursor/skills/pr-explainers/SKILL.md` (or `~/.agents/skills/pr-explainers/SKILL.md`) and run the **pr-explainers** checklist **after the PR exists**.

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
npm run understanding:diff -- --commit <sha>
```

## Layout

```
docs/understanding/
├── README.md
├── branches/<branch-slug>/
│   ├── reading-order.md    ← primary navigation (incremental order)
│   ├── index.json          ← machine-readable tiers + pending explainers
│   └── README.md
├── commits/<date>-<sha>-<slug>/
│   ├── explainer.html      (full tier)
│   ├── explainer.md
│   └── meta.json           (optional tier override)
├── prs/<branch-slug>/
│   ├── explainer.html
│   └── index.md
├── _templates/
└── _patterns/
```

## Commit tiers (summary)

| Tier | Explainer | Quiz |
|------|-----------|------|
| **skip** | None — row in reading order only | — |
| **light** | Short `explainer.md` | 2 questions |
| **full** | `explainer.html` + `.md` | 5 questions |

Trivial commits: ≤15 lines, mechanical, or `[skip-understanding]` in message.

## Checkpoints

| Mode | Behavior |
|------|----------|
| **pause** | Run understanding task → point human to reading-order → stop |
| **continue** | Human finished reading → resume next work |
| **pr** | **Default trigger** — full understanding pass when PR is ready |

See `.cursor/skills/pr-explainers/checkpoints.md`.

## PR description snippet

```markdown
## Review guide

- **Reading order:** docs/understanding/branches/<branch>/reading-order.md
- **PR roll-up:** docs/understanding/prs/<branch>/explainer.html
```

## Design influences

- [Geoffrey Litt — explain-diff](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)
- Andy Matuschak & Michael Nielsen — quizzes embedded in essays
- Seymour Papert — micro-worlds / Mathland
