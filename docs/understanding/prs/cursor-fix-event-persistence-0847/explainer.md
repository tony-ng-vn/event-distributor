# Fix event feed persistence — PR #3 story

**PR:** #3 · **Branch:** `cursor/fix-event-persistence-0847` · **3 files** vs `main`

---

## How to read this PR

1. **Start:** [reading-order.md](../branches/cursor-fix-event-persistence-0847/reading-order.md) — entry **#1**.
2. Open the per-commit explainer for the interactive quiz.
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
| 1 | `87f4c9d` | [Remove 24h cutoff + test](../commits/2026-07-05-87f4c9d-fix-event-feed-dropping-events-after-24-hours/explainer.html) |

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

### 3. When should the understanding layer run?

- [ ] After every git commit during implementation  
  <details><summary>Reveal</summary>❌ Per-PR workflow — once after the PR is created.</details>
- [ ] Once per PR, after the feature is production-ready and the PR is open  
  <details><summary>Reveal</summary>✅ See `.cursor/rules/feature-goal-workflow.mdc`.</details>
- [ ] Only on merge to main  
  <details><summary>Reveal</summary>❌ Generated on the feature branch before merge.</details>
- [ ] Never — it only works on PR #2  
  <details><summary>Reveal</summary>❌ Any PR can run the understanding bundle.</details>

### 4. What comes before creating the understanding layer in the goal method?

- [ ] Push directly to main  
  <details><summary>Reveal</summary>❌</details>
- [ ] Implement → sub-agent review loop until green → create PR  
  <details><summary>Reveal</summary>✅ Understanding is the final step after the PR exists.</details>
- [ ] Write explainers first, then code  
  <details><summary>Reveal</summary>❌ Code first, docs last.</details>
- [ ] Skip tests if typecheck passes  
  <details><summary>Reveal</summary>❌ Run relevant tests in the review loop.</details>

### 5. Where is the primary navigation for this PR's explainers?

- [ ] `AGENTS.md`  
  <details><summary>Reveal</summary>❌</details>
- [ ] `docs/understanding/branches/cursor-fix-event-persistence-0847/reading-order.md`  
  <details><summary>Reveal</summary>✅ Chronological table, oldest first.</details>
- [ ] `package.json`  
  <details><summary>Reveal</summary>❌</details>
- [ ] Raw `git diff` only  
  <details><summary>Reveal</summary>❌ Literate diffs are the point.</details>
