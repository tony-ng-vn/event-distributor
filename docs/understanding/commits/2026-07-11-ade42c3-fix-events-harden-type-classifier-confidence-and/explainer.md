# Harden confidence gate and deploy notes

**Commit:** `ade42c3` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Missing model confidence now soft-fails to other/fallback; human override skip is tested; deploy docs require the migration.

---

## Intuition

Without a score, trusting the model primary would pollute filters. Soft-fail keeps Other honest.

---

## Code

shouldSkipExistingTypeSource('human') is true unless force=true.

---

## Quiz (2 questions)

### 1. Missing confidence becomes?

- [ ] model social — <details><summary>Reveal</summary>❌</details>
- [ ] fallback other — <details><summary>Reveal</summary>✅</details>
- [ ] untyped — <details><summary>Reveal</summary>❌</details>
- [ ] delete row — <details><summary>Reveal</summary>❌</details>

### 2. Must migrate before prod filters work?

- [ ] No — <details><summary>Reveal</summary>❌</details>
- [ ] Yes — columns must exist or classify cannot persist — <details><summary>Reveal</summary>✅</details>
- [ ] Only for Clerk — <details><summary>Reveal</summary>❌</details>
- [ ] Only for email — <details><summary>Reveal</summary>❌</details>

