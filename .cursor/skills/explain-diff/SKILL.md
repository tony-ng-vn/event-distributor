---
name: explain-diff
description: >-
  Produce a literate, interactive explanation of a code change (commit, branch,
  or PR). Use after each incremental commit and again when a PR is ready. Outputs
  HTML and/or Markdown with background, intuition, code walkthrough, and quiz.
---

# Explain Diff

Create a **literate diff** — a teaching document that helps a human understand,
retain, and verify what changed, without reading a raw `git diff` pile.

Inspired by [Geoffrey Litt's explain-diff](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524)
and spaced-repetition quizzes (Andy Matuschak, Michael Nielsen).

## When to use

| Scope | Trigger | Output path |
|-------|---------|-------------|
| **Commit** | Immediately after each focused commit during agent work | `docs/understanding/commits/<YYYY-MM-DD>-<short-sha>-<slug>/` |
| **PR** | When the branch is ready for human review (before or with opening the PR) | `docs/understanding/prs/<branch-slug>/` |

Run **commit** explainers as you go — do not batch an entire feature into one explainer at the end.

## Zeroth principle: plain language

The reader should be able to **explain the change back to someone else** after reading.

- Write like a patient tutor in conversation — not a changelog, not a spec dump.
- **Every jargon word gets a plain-language gloss** the first time it appears.
  Example: *"RLS (row-level security — database rules that decide which rows each user can see)"*.
- Prefer short sentences. One idea per paragraph.
- If you cannot explain it simply, you do not understand it yet — explore the code more before writing.

## First principle: background before changes

Before *what changed*, teach *what was already there*.

1. **Deep background (skippable)** — for a reader new to this area. What subsystem is this? What problem does it solve in the app?
2. **Narrow background** — only the files, data flows, and invariants directly touched by this diff.

Explore surrounding code (`CONTEXT.md`, ADRs, callers, tests) before writing.

## Second principle: intuition before details

Before any code snippet, state the **goal in one sentence** a non-expert could repeat.

Then build intuition:

- Use **toy data** and concrete scenarios ("Alice pastes a Luma link…").
- Use **HTML figures** (not ASCII art): simplified UI mockups, data-flow diagrams with example payloads, before/after comparisons.
- Reuse a **small family of diagram styles** across the document so the reader learns your visual language once.

Only after intuition is established, walk through the code.

## Document structure

Every explainer has these sections in order:

### 1. At a glance

- One-sentence summary of the goal.
- Scope: commit SHA / branch / PR link, files touched (count), risk level (low / medium / high).
- "If you only read one section, read **Intuition**."

### 2. Background

Deep (collapsible in HTML) → narrow (always visible).

### 3. Intuition

Goal, mental model, toy example, figures. **No code yet** (except tiny illustrative fragments in figures).

### 4. Code — literate walkthrough

Walk changes in a **sensible narrative order**, not alphabetical file order.

For each logical step:

- Prose: *why* this change exists and how it connects to the previous step.
- Embedded snippet: the important lines only, with path comment.
- Callouts for definitions, edge cases, and "watch out" notes.

Group related edits (e.g. "wire the API to the database" may span three files — present as one story).

### 5. Quiz

**5 questions** (3–7 if the change is large; fewer if trivial).

- Medium difficulty — requires understanding the substance, not trick questions.
- Multiple choice, 4 options each.
- On answer: immediate ✅/❌ + **why** (teach on wrong answers too).
- Questions should cover: purpose, data flow, a edge case, one "what if we removed X", one integration point.

Embed interactively in HTML; use toggle blocks in Markdown (see `docs/understanding/_templates/explainer.md`).

### 6. Micro-world pointer (optional)

If a hands-on explorer would help more than reading, add a short note linking to or proposing a micro-world (see `explain-micro-world` skill). Do not build the micro-world inside this skill unless the human asked.

## Output formats

### HTML (preferred for reading + quiz)

1. Copy `docs/understanding/_templates/explainer.html` as a starting point.
2. Produce a **single self-contained file** (`explainer.html`) with inline CSS and JS.
3. Requirements:
   - Table of contents with anchor links.
   - One long page — no top-level tabs.
   - Responsive (readable on phone).
   - Code in `<pre>` tags, or styled blocks with `white-space: pre-wrap`.
   - HTML diagrams only — no ASCII diagrams.
   - Callout styles for definitions and warnings.
4. Also write `explainer.md` as a lightweight twin (same sections, quiz as toggles) for diffing and search.

### Markdown-only

If the human asked for Markdown only, write `explainer.md` following the same structure. Still include the quiz with toggle-style formatting.

## How to gather the diff

```bash
# After the commit you are explaining:
node scripts/understanding-diff.mjs --commit HEAD

# For a PR / branch (base = main unless specified):
node scripts/understanding-diff.mjs --branch <branch> --base main
```

Read the emitted `diff-context.json` and explore referenced files before writing.

## Quality checklist

Before finishing, verify:

- [ ] A newcomer could read Background + Intuition and predict *kind* of code changes.
- [ ] Every technical term introduced has a plain-language explanation.
- [ ] Code section follows narrative order, not `git diff` order.
- [ ] Quiz questions are answerable from the document but not by keyword matching alone.
- [ ] HTML validates: code blocks preserve newlines; quiz buttons work.
- [ ] Paths and SHAs in the explainer match the commit/branch being described.

## Tone

Clear, warm, precise — Martin Kleppmann's clarity in a conversational register. Smooth transitions between sections. It is okay to use light humor; never be condescending.

## Do not

- Dump the raw diff without narrative.
- Assume the reader has your terminal context or chat history.
- Skip the quiz ("it's a small change") — small changes compound; the quiz stays.
- Commit secrets, `.env` values, or API keys into explainers.
