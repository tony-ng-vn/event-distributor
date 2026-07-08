# Fix event feed dropping events after 24 hours

**Commit:** `87f4c9d` · **Tier:** full · **3 files**  
**Series:** entry #1 — [reading-order](../../branches/cursor-fix-event-persistence-0847/reading-order.md)

---

## At a glance

Events were saved in Postgres but disappeared from the app about a day after their start time. The feed API filtered out anything older than 24 hours. This commit removes that filter and sorts upcoming events first, then recent past events.

---

## Background

The shared feed loads via `GET /api/events` → `listFeedEvents()` → database query in `events-service.ts`. Ingest still writes rows correctly; the bug was **read-path filtering**, not missing persistence.

### What mattered before

`fetchUpcomingEventRows()` applied `.gte("start_at", cutoff)` where `cutoff = now - 24 hours`. Once an event's start time was more than a day ago, every feed reload hid it.

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

### Step 2 — Sort upcoming first

```typescript
function sortFeedEventRows(events: InsforgeEventRow[]) {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const aUpcoming = new Date(a.start_at).getTime() >= now;
    const bUpcoming = new Date(b.start_at).getTime() >= now;
    // upcoming first (nearest first), then past (most recent first)
  });
}
```

### Step 3 — Regression test for old events

```typescript
// tests/integration/events-service.test.ts
it("keeps events visible after their start date has passed", async () => {
  // insert event with start_at 3 days ago
  const feed = await listFeedEvents();
  expect(feed.some((event) => event.id === inserted?.id)).toBe(true);
});
```

---

## Quiz (5 questions)

### 1. Why did events seem to “disappear” even though they were in the database?

- [ ] RLS policies hid old rows  
  <details><summary>Reveal</summary>❌ RLS allows public read; the filter was in application code.</details>
- [ ] The API excluded rows with `start_at` older than 24 hours  
  <details><summary>Reveal</summary>✅ The query used `.gte("start_at", cutoff)` with a rolling 24h window.</details>
- [ ] Events were stored only in sessionStorage  
  <details><summary>Reveal</summary>❌ Event data is server-persisted.</details>
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

### 3. Which function name changed to reflect the new behavior?

- [ ] `listFeedEvents` → `listAllFeedEvents` only  
  <details><summary>Reveal</summary>❌ `listFeedEvents` still exists; it delegates to `listAllFeedEvents`.</details>
- [ ] `ingestLumaEvent` → `ingestAnyEvent`  
  <details><summary>Reveal</summary>❌ Ingest unchanged.</details>
- [ ] `fetchUpcomingEventRows` → `fetchAllEventRows`  
  <details><summary>Reveal</summary>✅ The internal fetch helper was renamed.</details>
- [ ] `deleteEvent` → `softDeleteEvent`  
  <details><summary>Reveal</summary>❌ Admin delete unchanged.</details>

### 4. Does this commit change how admin delete works?

- [ ] Yes — anyone can delete  
  <details><summary>Reveal</summary>❌ Admin-only delete unchanged.</details>
- [ ] No — only the feed query and sort changed  
  <details><summary>Reveal</summary>✅</details>
- [ ] Yes — soft delete added  
  <details><summary>Reveal</summary>❌</details>
- [ ] Yes — events auto-delete after 24h  
  <details><summary>Reveal</summary>❌ That was the bug we fixed.</details>

### 5. When is the understanding layer generated for this PR?

- [ ] Automatically after every git commit  
  <details><summary>Reveal</summary>❌ Per-PR workflow — not per commit.</details>
- [ ] Once, after the PR is created and the feature is production-ready  
  <details><summary>Reveal</summary>✅ Goal method: implement → review loop → PR → understanding.</details>
- [ ] Only when merged to main  
  <details><summary>Reveal</summary>❌ Generated on the feature branch before merge.</details>
- [ ] Never — docs are optional  
  <details><summary>Reveal</summary>❌ Required for human review.</details>
