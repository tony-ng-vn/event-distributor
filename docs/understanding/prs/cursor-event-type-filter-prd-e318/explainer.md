# PR roll-up: event type filter + classifier PRD

**Branch:** `cursor/event-type-filter-prd-e318` · **Base:** `main`  
**Generated:** 2026-07-11  
**Issue:** [#46](https://github.com/tony-ng-vn/event-distributor/issues/46) · **PR:** [#47](https://github.com/tony-ng-vn/event-distributor/pull/47)

---

## At a glance

Docs-only PR. Research shows keyword typing fails on playful SF Luma titles; the PRD proposes a six-type taxonomy, async LLM classification with soft failure, and feed type filters. Production DB was not dumped here (missing credentials) — use `scripts/dump-event-type-corpus.mjs` locally before implementation.

---

## How to read

1. Research notes + proxy corpus (`33353f3`)
2. PRD (`56fde7c`)
3. Contract tightening after review (`9cf0d60`)

Reading order: [`../../branches/cursor-event-type-filter-prd-e318/reading-order.md`](../../branches/cursor-event-type-filter-prd-e318/reading-order.md)

---

## Decisions locked in the docs

- Closed types: social, builders, talks, sports, arts, other  
- Insert first → async classify → never block calendar sync  
- `untyped` excluded from Other  
- `type_source`: untyped | model | rules | fallback | human  
- Not ready-for-agent until human confirms taxonomy + labels a prod sample  

---

## Quiz (2 questions)

### 1. Is this PR an implementation of type filters?

- [ ] Yes, feed pills ship here — <details><summary>Reveal</summary>❌ Docs/PRD only.</details>
- [ ] No — research + requirements for a later agent — <details><summary>Reveal</summary>✅</details>

### 2. What blocks marking #46 ready-for-agent?

- [ ] Nothing — <details><summary>Reveal</summary>❌ Need taxonomy confirmation + prod corpus spot-check.</details>
- [ ] Human taxonomy OK + local prod dump labeled — <details><summary>Reveal</summary>✅ Stated in the PRD further notes.</details>
