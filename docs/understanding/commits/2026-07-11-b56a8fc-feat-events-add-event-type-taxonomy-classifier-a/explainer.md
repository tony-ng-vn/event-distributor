# Event-type taxonomy, classifier, and migration

**Commit:** `b56a8fc` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Adds the closed type ids, keyword/LLM classifier modules, async schedule helper, SQL migration for type columns, and a rules backfill script.

---

## Intuition

Events used to have no category. This commit creates the storage and brain: a small fixed list of types, a classifier that can use rules or InsForge AI, and columns on `events` so types can persist.

---

## Code

Classify runs after ingest via `after()` so calendar sync is not blocked.

---

## Quiz (2 questions)

### 1. Why async classify?

- [ ] To make titles prettier — <details><summary>Reveal</summary>❌</details>
- [ ] So calendar sync / ingest is not blocked by the model — <details><summary>Reveal</summary>✅</details>
- [ ] Postgres requires it — <details><summary>Reveal</summary>❌</details>
- [ ] Clerk requires it — <details><summary>Reveal</summary>❌</details>

### 2. Default primary_type before classify?

- [ ] null — <details><summary>Reveal</summary>❌</details>
- [ ] other with type_source untyped — <details><summary>Reveal</summary>✅</details>
- [ ] social — <details><summary>Reveal</summary>❌</details>
- [ ] builders — <details><summary>Reveal</summary>❌</details>

