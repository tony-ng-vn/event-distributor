# Explain diff (module)

Part of the **understanding** skill bundle. Produce a **literate diff** — prose
that teaches what changed instead of dumping raw `git diff` output.

Inspired by [Geoffrey Litt's explain-diff](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524).

## Zeroth principle: plain language

The reader should be able to **explain the change back to someone else**.

- Conversational tone — not a changelog.
- **Every jargon word gets a plain-language gloss** on first use.
- Short sentences; one idea per paragraph.

## First principle: background before changes

Before *what changed*, teach *what was already there*.

1. **Deep background (skippable)** — for beginners new to this area.
2. **Narrow background** — files, flows, and invariants this diff touches.

*(Light tier: skip deep background; keep one narrow paragraph.)*

## Second principle: intuition before details

State the **goal in one sentence** before code. Use toy data and HTML figures
(not ASCII art). Code walkthrough comes after intuition.

## Document structure

### Full tier

1. **At a glance** — goal, scope, risk, "read Intuition first"
2. **Background** — deep (collapsible) + narrow
3. **Intuition** — goal, figures, mental model
4. **Code** — literate walkthrough in narrative order (not alphabetical)
5. **Quiz** — 5 multiple-choice questions with feedback
6. **Micro-world** — link or proposal if applicable

### Light tier

1. **At a glance**
2. **Intuition** (brief)
3. **Code** (1–2 steps)
4. **Quiz** — 2 questions

## Output

| Tier | Files |
|------|-------|
| full | `explainer.html` + `explainer.md` |
| light | `explainer.md` (HTML optional) |

Templates: `docs/understanding/_templates/`

Gather diff context:

```bash
npm run understanding:diff -- --commit <sha>
npm run understanding:diff -- --branch <branch> --base main
```

## Quiz rules

- Medium difficulty — substance, not gotchas.
- Wrong answers include **why** (teach on failure).
- full: 5 Q · light: 2 Q · skip: none

## Quality checklist

- [ ] Background + Intuition let reader predict the *kind* of code change
- [ ] Jargon glossed
- [ ] Code in narrative order
- [ ] Quiz requires understanding, not keyword grep
- [ ] No secrets in explainers

## Do not

- Dump raw diff without narrative
- Assume chat/terminal context
- Write a full essay for commits classified `skip`
