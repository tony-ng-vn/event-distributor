# PRD: event type filter and classifier

**Commit:** `56fde7c` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Adds the product requirements doc for filtering the feed by event type. It proposes a small closed taxonomy, an LLM classifier (with soft fallback), and type filter pills — tracked as GitHub issue #46.

---

## Intuition

Friends do not need Eventbrite’s giant tag tree. They need coarse buckets: social hangouts, builders/AI, talks, sports, arts, and other. Because Luma titles are jokes and mashups, the PRD rejects “regex forever” and recommends classifying after ingest, then letting the feed filter on a stored `primary_type`.

---

## Code

No application code in this commit — only `docs/prd/event-type-filter-and-classifier.md`. The important contract for a future agent is the closed id set and the idea that ingest should still work if the model is down.

---

## Quiz (2 questions)

### 1. Which taxonomy is proposed for v1?

- [ ] Free-form user tags — <details><summary>Reveal</summary>❌ Closed set only in v1.</details>
- [ ] `social`, `builders`, `talks`, `sports`, `arts`, `other` — <details><summary>Reveal</summary>✅ Fixed friend-facing buckets.</details>
- [ ] Luma Plus API tags only — <details><summary>Reveal</summary>❌ Out of scope; scrape path has no tags.</details>
- [ ] Online vs offline only — <details><summary>Reveal</summary>❌ `is_online` already exists separately.</details>

### 2. What should happen if the classifier fails?

- [ ] Reject the ingest — <details><summary>Reveal</summary>❌ Soft-fail; never block paste/sync.</details>
- [ ] Soft-fail toward `other` / untyped handling — <details><summary>Reveal</summary>✅ Ingest stays healthy; typing catches up.</details>
- [ ] Delete the event — <details><summary>Reveal</summary>❌ No.</details>
- [ ] Email every admin — <details><summary>Reveal</summary>❌ Not required.</details>
