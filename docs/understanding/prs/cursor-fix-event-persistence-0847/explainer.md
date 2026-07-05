# Fix event feed persistence — PR #3 story

**PR:** #3 · **Branch:** `cursor/fix-event-persistence-0847` · **3 files** vs `main`

---

## How to read this PR

1. **Start:** [reading-order.md](../branches/cursor-fix-event-persistence-0847/reading-order.md) — entry **#1**.
2. Open the per-commit explainer for the interactive quiz (light tier: markdown only).
3. **Then** read this roll-up for the whole arc (optional).

---

## At a glance

Users reported events vanishing after about a day. Data was still in Postgres; the feed API applied a rolling 24-hour `start_at` filter. This PR removes that filter and keeps a sensible sort order.

---

## Background

The shared feed loads via `GET /api/events` → `listFeedEvents()` → database query in `events-service.ts`. Ingest still writes rows correctly; the bug was **read-path filtering**, not missing persistence.

---

## Intuition

**Goal:** Treat the feed as a durable shared list. Upcoming events should be easy to find at the top; past events should remain visible instead of silently dropping off.

---

## One commit (read in order)

| # | SHA | Chapter |
|---|-----|---------|
| 1 | `87f4c9d` | [Remove 24h cutoff + test](../commits/2026-07-05-87f4c9d-fix-event-feed-dropping-events-after-24-hours/explainer.md) |

---

## Quiz

### 1. What actually caused events to disappear from the UI?

- [ ] Database rows were deleted nightly  
  <details><summary>Reveal</summary>❌ Rows remained; the API stopped returning them.</details>
- [ ] A 24-hour `start_at` filter on the feed query  
  <details><summary>Reveal</summary>✅</details>
- [ ] Clerk auth expiring  
  <details><summary>Reveal</summary>❌ Unrelated.</details>
- [ ] localStorage clearing  
  <details><summary>Reveal</summary>❌ Events are server-persisted.</details>

### 2. Does this PR change how admin delete works?

- [ ] Yes — anyone can delete  
  <details><summary>Reveal</summary>❌ Admin-only delete unchanged.</details>
- [ ] No — only the feed query and sort changed  
  <details><summary>Reveal</summary>✅</details>
- [ ] Yes — soft delete added  
  <details><summary>Reveal</summary>❌</details>
- [ ] Yes — passes now persist server-side for anonymous users  
  <details><summary>Reveal</summary>❌ Anonymous pass is still sessionStorage-only.</details>

### 3. How does the understanding layer apply to this PR?

- [ ] Automatically on every git push via CI  
  <details><summary>Reveal</summary>❌ No CI job; agents run the skill bundle deliberately.</details>
- [ ] Deliberately via the `understanding` skill after substantive work  
  <details><summary>Reveal</summary>✅ See `.cursor/skills/understanding/SKILL.md`.</details>
- [ ] Never — it only works on PR #2  
  <details><summary>Reveal</summary>❌ Any branch can run `npm run understanding:index`.</details>
- [ ] Only if commit message contains `[full-understanding]`  
  <details><summary>Reveal</summary>❌ Tiers are classified by size/mechanics.</details>
