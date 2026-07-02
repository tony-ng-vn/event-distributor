# Understanding layer

How humans stay in the loop while agents ship code — explainers, quizzes, and micro-worlds.

## Problem

Long agent runs produce large diffs. Raw `git diff` is hard to review, easy to skim without understanding, and impossible to "quiz yourself" on. Context compounds across commits.

## Solution

An **understanding layer** generated **incrementally**:

| When | What | Skill |
|------|------|-------|
| Each focused commit | Literate diff + quiz (+ optional micro-world proposal) | `explain-diff` |
| Hands-on exploration needed | Interactive playground | `explain-micro-world` |
| PR ready for review | Roll-up explainer linking commit docs | `explain-diff` |

## Layout

```
docs/understanding/
├── README.md
├── _templates/          # HTML + Markdown scaffolds
├── _patterns/           # Reusable micro-world patterns (human-approved)
├── commits/
│   └── 2026-07-02-a1b2c3d-add-feed-filter/
│       ├── explainer.html
│       ├── explainer.md
│       ├── diff-context.json   # machine-readable diff summary (optional)
│       └── micro-world/        # if built
└── prs/
    └── cursor-feature-d250/
        ├── explainer.html
        ├── explainer.md
        └── index.md              # links to commit explainers
```

## For humans

1. After an agent commits, open the matching folder under `docs/understanding/commits/`.
2. Read **Background** and **Intuition** first.
3. Skim the **Code** walkthrough.
4. Take the **Quiz** — if you miss questions, re-read or ask for a micro-world.
5. At PR time, read the roll-up under `docs/understanding/prs/`.

Open `explainer.html` in a browser for the interactive quiz.

## For agents

See `.cursor/rules/understanding-layer.mdc` and skills:

- `.cursor/skills/explain-diff/SKILL.md`
- `.cursor/skills/explain-micro-world/SKILL.md`

Helper:

```bash
node scripts/understanding-diff.mjs --commit HEAD
node scripts/understanding-diff.mjs --branch my-branch --base main
```

## Design influences

- [Geoffrey Litt — explain-diff](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524) — literate diffs + embedded quizzes
- Andy Matuschak & Michael Nielsen — spaced repetition inside essays
- Seymour Papert — *Mathland* / micro-worlds for learning by inhabiting

## PR description snippet

When opening a PR, include:

```markdown
## Review guide

- **PR explainer:** docs/understanding/prs/<branch>/explainer.html
- **Per-commit:** docs/understanding/prs/<branch>/index.md
```
