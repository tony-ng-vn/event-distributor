# PR roll-up: event type filter + classifier

**Branch:** `cursor/event-type-filter-prd-e318` · **Base:** `main`  
**Generated:** 2026-07-11  
**Issue:** [#46](https://github.com/tony-ng-vn/event-distributor/issues/46) · **PR:** [#47](https://github.com/tony-ng-vn/event-distributor/pull/47)

---

## At a glance

Ships research, PRD, and implementation for filtering the shared feed by event type. Events classify asynchronously after ingest (rules by default; optional InsForge AI). Friends get type pills; admins can override and backfill.

---

## How to read

1. Research + PRD (first three docs commits)
2. Taxonomy / classifier / migration (`b56a8fc`)
3. API serialization + admin routes (`912b4fc`)
4. Feed UI (`6ccb67f`)
5. Tests + changelog (`7c6899d`)
6. Confidence / deploy harden (`ade42c3`)

Reading order: [`../../branches/cursor-event-type-filter-prd-e318/reading-order.md`](../../branches/cursor-event-type-filter-prd-e318/reading-order.md)

---

## Decisions locked in

- Closed types: social, builders, talks, sports, arts, other
- Insert first → async classify → never block calendar sync
- Other excludes `untyped`
- Human overrides are sticky
- Apply migration at deploy (`npm run db:migrate`)

---

## Quiz (2 questions)

### 1. Does ingest wait for the LLM?

- [ ] Yes — <details><summary>Reveal</summary>❌ Async via after().</details>
- [ ] No — classify is fire-and-forget — <details><summary>Reveal</summary>✅</details>

### 2. What must happen before production type filters work?

- [ ] Nothing — <details><summary>Reveal</summary>❌</details>
- [ ] Apply the type-columns migration (and set EVENT_TYPE_CLASSIFIER) — <details><summary>Reveal</summary>✅</details>
