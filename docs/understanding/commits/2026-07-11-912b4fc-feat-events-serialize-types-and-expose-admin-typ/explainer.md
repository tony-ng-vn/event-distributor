# Serialize types and admin type APIs

**Commit:** `912b4fc` · **Tier:** light  
**Generated:** 2026-07-11

---

## At a glance

Feed JSON now includes primaryType/typeSource; ingest schedules classify; admins can PATCH type or POST backfill.

---

## Intuition

The UI cannot filter until the API returns type fields. This commit wires serialization and the admin override/backfill routes.

---

## Code

`scheduleEventTypeClassification(serialized.id)` runs next to the notification schedule after insert.

---

## Quiz (2 questions)

### 1. What does PATCH /api/events/[id]/type do?

- [ ] Deletes the event — <details><summary>Reveal</summary>❌</details>
- [ ] Sets primary_type with type_source=human (admin) — <details><summary>Reveal</summary>✅</details>
- [ ] Starts calendar sync — <details><summary>Reveal</summary>❌</details>
- [ ] Sends email — <details><summary>Reveal</summary>❌</details>

### 2. Who can backfill types?

- [ ] Anyone signed in — <details><summary>Reveal</summary>❌</details>
- [ ] Admins via POST /api/admin/event-types/backfill — <details><summary>Reveal</summary>✅</details>
- [ ] Anonymous visitors — <details><summary>Reveal</summary>❌</details>
- [ ] Only Clerk support — <details><summary>Reveal</summary>❌</details>

