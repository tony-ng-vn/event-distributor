# Commit policy — when to explain

Classify each commit before writing an explainer. The index script
(`understanding-index.mjs`) suggests a tier; you confirm or override.

## Tiers

| Tier | When | Explainer |
|------|------|-----------|
| **skip** | Trivial — no teaching value | None; list in reading order with reason |
| **light** | Small but non-obvious | Short `explainer.md`; 2 quiz questions |
| **full** | Substantive logic, architecture, or risk | `explainer.html` + `explainer.md`; 5 quiz questions |

---

## Skip (`skip`)

Skip when **all** of the following are true:

- Net change is small: **≤ 15 lines** changed (insertions + deletions), excluding
  generated/vendor paths (`package-lock.json`, `*.snap`, migration SQL auto-gen).
- The change is **mechanical**: typo, comment-only, formatting, lint autofix,
  dependency lockfile-only, rename without behavior change.
- **Or** the commit message contains `[skip-understanding]`.

Still add a row to `reading-order.md`:

```markdown
| 4 | `a1b2c3d` | skip | Fix typo in README | — |
```

So the human sees the commit happened but does not need to read an essay.

---

## Light (`light`)

Use **light** when the change is real but narrow:

- **16–80 lines** changed (approximate — judgment allowed).
- **1–3 files**, mostly one concern.
- Examples: wire a button to an existing handler, add a field to a type, simple
  test coverage for obvious behavior.

**Light explainer structure:**

1. At a glance (2–3 sentences)
2. Intuition (short — no deep background section)
3. Code (one or two steps)
4. Quiz (**2 questions**)

HTML optional; Markdown is enough.

---

## Full (`full`)

Use **full** for everything substantive:

- New feature slice, API route, schema migration, auth rule, non-trivial algorithm.
- **> 80 lines** or **4+ files** with coordinated behavior.
- Anything the human would regret not understanding.

Follow the complete structure in [explain-diff.md](./explain-diff.md).

---

## Overrides

| Situation | Action |
|-----------|--------|
| Small LOC but subtle bugfix | Upgrade to **light** or **full** — LOC is not truth |
| Large commit mixing concerns | Prefer splitting commits next time; write one **full** explainer that calls out the parts |
| Human says "explain everything" | Upgrade all to at least **light** |
| Human says "only checkpoints" | Only run understanding task at explicit checkpoints, but still update reading order for skips |

Record overrides in the commit folder's `meta.json`:

```json
{
  "tier": "full",
  "tierReason": "Only 40 LOC but changes RLS policy — upgraded from light"
}
```

---

## Batching trivial work

When you notice several trivial edits queued:

- **Prefer** one commit: `chore: fix typos in feed components [skip-understanding]`
- **Avoid** five separate typo commits each needing a reading-order row

Best effort — perfection is not required.
