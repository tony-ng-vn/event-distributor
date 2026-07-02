---
name: explain-micro-world
description: >-
  Propose or build a small interactive "micro-world" so the human can inhabit a
  change and build intuition by doing, not only reading. Use after explain-diff
  when hands-on exploration would help, or when the human asks.
---

# Explain Micro-World

A **micro-world** is a small, safe playground where the human **does the thing** —
stepping through execution, clicking through a port, scrubbing a timeline — and
builds the same muscle memory as implementing by hand, but faster.

Inspired by Seymour Papert's *Mathland*: learn by living in the environment.

## When to use

Suggest or build a micro-world when **any** of these apply:

- The change has non-obvious **runtime behavior** (state machines, parsers, async flows).
- The human is **unfamiliar with a framework** and needs to see cause → effect.
- A migration or refactor is hard to review as a static diff.
- The `explain-diff` quiz would be easier after 5 minutes of play.

**Do not** build a micro-world for every commit. Propose 1–3 options; let the human pick or iterate.

## Workflow

1. **Propose** — write `micro-world-proposal.md` in the same understanding folder as the explainer.
2. **Human chooses** — they pick an option, say "skip", or ask for a variant.
3. **Build** — implement the smallest version that teaches the core idea.
4. **Link** — update `explainer.html` / `explainer.md` with a "Try it" section.

Output path: same folder as the commit or PR explainer, e.g.
`docs/understanding/commits/2026-07-02-a1b2c3d-add-feed-filter/micro-world/`

## What makes a good micro-world

| Property | Good | Bad |
|----------|------|-----|
| Scope | One concept from the diff | Full app clone |
| Interaction | Click, step, drag, type — immediate feedback | Read-only wall of text |
| Safety | Mock data, local-only, no production side effects | Requires prod credentials |
| Time to value | Useful in &lt; 2 minutes | 30-minute setup |
| Fidelity | Shows the *essence* of the real mechanism | Pixel-perfect UI polish |

## Proposal template (`micro-world-proposal.md`)

```markdown
# Micro-world proposals for: <title>

## What you're trying to understand
<one sentence>

## Option A: <name>
- **You do:** <verbs — click, step, edit>
- **You see:** <visible feedback>
- **Teaches:** <specific insight from the diff>
- **Effort:** low | medium | high
- **Form:** static HTML | small Next route | CLI script | Storybook story

## Option B: ...
## Option C: ...

## Recommendation
<which option and why; or "skip — reading is enough because …">
```

Present **2–3 options** with different effort levels when possible.

## Form factors (pick one)

### 1. Step-through debugger (HTML or React)

Best for: algorithms, parsers, state machines, Prolog-style rule evaluation.

- Timeline scrubber or Step / Back buttons.
- Panels for stack, variables, active rule, log.
- Optional comment pins ("nice — we applied rule X here").

### 2. Command center (side-by-side)

Best for: migrations, refactors, framework ports.

- Old vs new behavior visible at once.
- Buttons run **one migration step** at a time.
- File tree or diff panel updates after each step.

### 3. Toy API playground

Best for: new endpoints, auth rules, data shaping.

- Pre-filled example requests (toy JSON).
- Shows request → handler → response (mocked DB).
- Highlight which lines in the real code correspond to each stage.

### 4. UI sandbox

Best for: component behavior, responsive layout, interaction states.

- Isolated route or Storybook story with knobs for props.
- Annotated hotspots linking to source files.

### 5. Trace replay

Best for: event pipelines, ingest flows.

- Sample input file or URL.
- Animated pipeline: each stage lights up with intermediate data.

## Implementation rules

- Prefer **self-contained HTML** in `micro-world/index.html` when no backend is needed.
- For app-integrated worlds, use a dev-only route under `src/app/dev/...` guarded by `NODE_ENV === 'development'` or an existing e2e seed pattern — **never** expose unsafe controls in production.
- Reuse mock fixtures from `tests/fixtures/` when they exist.
- Include a 3-line "How to open" at the top of the micro-world README.
- Keep dependencies minimal — no new npm packages unless the human approves.

## After building

1. Add a **Try it** section to the explainer linking to the micro-world.
2. Add **2 quiz questions** to the explainer that reference what the micro-world teaches (update quiz in place).
3. Note limitations: what the toy simplifies vs production.

## Collaboration loop

The human may say:

- "Option B but smaller"
- "Combine A and C"
- "This form works — reuse it next time"

Capture reusable patterns in `docs/understanding/_patterns/` when the human confirms a form is worth repeating.
