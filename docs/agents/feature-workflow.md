# Feature workflow (goal method)

How agents ship production-ready features in this repo.

## Pipeline

```
1. Implement        Code + tests (focused commits, no understanding docs yet)
2. Review loop      Sub-agent review → fix → re-run checks → repeat until green
3. Create PR        Push branch, open/update pull request
4. Understanding    Run pr-explainers skill once per PR
```

Rules: `.cursor/rules/feature-goal-workflow.mdc`

## Step 1 — Implement

- Read domain docs (`docs/agents/domain.md`) and relevant skills.
- Commit logical slices (`incremental-commits` rule).
- Run typecheck and relevant tests as you go.
- **Do not** write understanding explainers during this phase.

## Step 2 — Review loop (mandatory)

Before any PR:

1. Launch a sub-agent (`review-and-ship` skill or `generalPurpose` task).
2. Fix blocking issues.
3. Re-run `npm run typecheck`, `npm run test:unit`, and affected integration tests.
4. Repeat until approved.

"First draft compiles" is not done. **Production-ready** is the goal.

## Step 3 — Create PR

- Push with `git push -u origin <branch>`.
- PR body: problem, root cause, fix, verification results.
- Do not merge before human review.

## Step 4 — Understanding layer

After the PR exists:

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
```

Follow `.cursor/skills/pr-explainers/SKILL.md` — classify commits, write explainers, PR roll-up, add Review guide to PR description.

**One pass per PR**, not per commit.

## Sub-agents

When spawning a sub-agent for implementation, tell it to use the same goal method: implement, self-review, fix until green. The parent agent still runs a formal sub-agent review before opening the PR.

## Related

| Doc | Purpose |
|-----|---------|
| `.cursor/rules/feature-goal-workflow.mdc` | Always-on agent rule |
| `.cursor/rules/understanding-layer.mdc` | Per-PR understanding trigger |
| `docs/agents/understanding-layer.md` | Explainer layout and tiers |
| `.cursor/skills/pr-explainers/SKILL.md` | pr-explainers task checklist |
