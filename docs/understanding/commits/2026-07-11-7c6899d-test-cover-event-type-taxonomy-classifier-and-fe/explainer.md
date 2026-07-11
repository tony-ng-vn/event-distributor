# Tests and v0.7.0 changelog

**Commit:** `7c6899d` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Unit/integration coverage for taxonomy, classifier modes, Other filter semantics, plus env example and changelog bump to 0.7.0.

---

## Intuition

Classifier unit tests inject a fake chat completion so InsForge AI is not required in CI.

---

## Code

EVENT_TYPE_CLASSIFIER=off in test setup keeps ingest assertions on untyped.

---

## Quiz (2 questions)

### 1. Why set EVENT_TYPE_CLASSIFIER=off in tests?

- [ ] Disable Luma — <details><summary>Reveal</summary>❌</details>
- [ ] Keep ingest assertions deterministic as untyped — <details><summary>Reveal</summary>✅</details>
- [ ] Speed up CSS — <details><summary>Reveal</summary>❌</details>
- [ ] Skip Clerk — <details><summary>Reveal</summary>❌</details>

### 2. Package version after this feature?

- [ ] 0.6.3 — <details><summary>Reveal</summary>❌</details>
- [ ] 0.7.0 — <details><summary>Reveal</summary>✅</details>
- [ ] 1.0.0 — <details><summary>Reveal</summary>❌</details>
- [ ] 0.6.4 — <details><summary>Reveal</summary>❌</details>

