# Fix event feed dropping events after 24 hours

**Commit:** `87f4c9d` · **Tier:** light · **3 files**  
**Series:** entry #1 — [reading-order](../../branches/cursor-fix-event-persistence-0847/reading-order.md)

---

## At a glance

Events were saved in Postgres but disappeared from the app about a day after their start time. The feed API filtered out anything older than 24 hours. This commit removes that filter and sorts upcoming events first, then recent past events.

---

## Intuition

**Goal:** If someone adds an event to the shared feed, it should stay visible until an admin deletes it — not vanish because a server-side date window expired.

Before: `GET /api/events` only returned rows where `start_at >= now - 24h`. After: load all rows, then sort so upcoming events appear first (nearest first) and past events follow (most recent first).

---

## Code

### Step 1 — Remove the 24-hour cutoff

```typescript
// src/lib/events-service.ts
async function fetchAllEventRows() {
  const db = getInsforgeAdmin();

  const { data, error } = await db.database
    .from("events")
    .select(eventSelect)
    .order("start_at", { ascending: true });
  // ...
  const events = sortFeedEventRows((data ?? []) as InsforgeEventRow[]);
```

> **InsForge** — the Postgres backend (BaaS) this app uses for shared event storage.

### Step 2 — Regression test for old events

```typescript
// tests/integration/events-service.test.ts
it("keeps events visible after their start date has passed", async () => {
  // insert event with start_at 3 days ago
  const feed = await listFeedEvents();
  expect(feed.some((event) => event.id === inserted?.id)).toBe(true);
});
```

---

## Quiz (2 questions)

### 1. Why did events seem to “disappear” even though they were in the database?

- [ ] RLS policies hid old rows  
  <details><summary>Reveal</summary>❌ RLS allows public read; the filter was in application code.</details>
- [ ] The API excluded rows with `start_at` older than 24 hours  
  <details><summary>Reveal</summary>✅ The query used `.gte("start_at", cutoff)` with a rolling 24h window.</details>
- [ ] Events were stored only in sessionStorage  
  <details><summary>Reveal</summary>❌ Event data is server-persisted; sessionStorage only tracks anonymous “pass” state.</details>
- [ ] A nightly cleanup job deleted them  
  <details><summary>Reveal</summary>❌ No TTL or cron cleanup exists.</details>

### 2. How are feed results ordered after this fix?

- [ ] Oldest events first, all rows  
  <details><summary>Reveal</summary>❌ Upcoming events come first.</details>
- [ ] Upcoming first (nearest first), then past events (most recent first)  
  <details><summary>Reveal</summary>✅ `sortFeedEventRows` splits on `start_at >= now`.</details>
- [ ] Random order  
  <details><summary>Reveal</summary>❌</details>
- [ ] Only future events, unsorted  
  <details><summary>Reveal</summary>❌ Past events are included again.</details>
