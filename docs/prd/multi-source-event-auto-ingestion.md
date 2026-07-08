## Problem Statement

Community members discover and register for Luma events independently, but the shared feed still depends on manually pasting each event URL. Friends cannot see what someone signed up for unless that person remembers to paste the link. Many SF events also never reach the group at all. The core gap is **getting events into the shared feed** so everyone sees the same list, then using **Accept / Pass** to show who among friends is interested in going or not — without copy-pasting links after every signup.

Whether Luma's host has approved a registration is **not** in scope for MVP.

## Solution

One **shared feed**. Events enter it through ingestion — how they got there does not matter to users. Two goals, same outcome (event visible to the whole group):

1. **From a person** — when a member signs up on Luma, that event is added to the feed for everyone (via Gmail sync, or manual paste as fallback).
2. **From discovery** — when someone finds events (e.g. pastes a weekly SF roundup URL), those events are added to the feed for everyone.

All ingested events look the same in the feed. No badges, labels, or tabs for signup vs discovery vs manual source.

The **social layer** is unchanged: **Accept** (interested) and **Pass** (not interested) among friends. That is what the group cares about — not where the event came from.

## User Stories

### Core — populate the feed

1. As a community member, I want events I register for on Luma to appear in the shared feed automatically, so that the whole group sees them without me copy-pasting.
2. As a community member, I want my signups to appear even when the host has not approved me yet, so that the group sees events I applied for — not only ones I was accepted into.
3. As a community member, I want to see all events anyone in the group has brought in, so that I stay aligned with what friends are doing and what is happening in SF.
4. As a community member, I want to paste a URL (event page or roundup page) and bulk-add events to the feed, so that found events reach the whole group at once.
5. As a community member, I want duplicate Luma URLs to merge into one feed item, so that the same event does not appear twice.
6. As a community member, I want ingested events to show the same metadata (title, date, cover, location, host) as today, so that cards look consistent.
7. As a community member, I want a link to the original Luma event page on every card, so that I can register officially there.
8. As a community member, I want events I signed up for before connecting sync to remain addable via manual paste, so that history is not lost.

### Core — social interest (unchanged)

9. As a community member, I want to tap **Accept** to signal I am interested in going, so that friends see me in the interested list.
10. As a community member, I want to tap **Pass** to signal I am not interested, so that friends see who is out.
11. As a community member, I want event cards to show who is interested and who passed among friends, so that social coordination is the primary signal.
12. As a community member, I want Accept and Pass to remain independent of Luma RSVP, so that interested here does not mean registered on Luma.
13. As a community member, I want one feed for all events, so that I do not switch views by source.

### Auto-ingest — Gmail (personal signups)

14. As a community member, I want to connect Gmail once, so that my Luma registration emails add events to the group feed without manual action.
15. As a community member, I want a clear explanation of why Gmail access is needed before OAuth, so that I trust the permission request.
16. As a community member, I want to disconnect Gmail sync from settings, so that I can revoke access.
17. As a community member, I want signup detection to include require-approval and waitlist events, not only open registration.
18. As a community member, I want sync to run periodically and on demand (“sync now”), so that new signups appear without manual refresh.
19. As a community member, I want sync failures visible in settings with retry, so that expired tokens are recoverable.

### Auto-ingest — bulk URL import (discovery)

20. As a community member, I want bulk import to extract all `lu.ma` URLs from pasted page text or a fetched URL, so that one action adds many events.
21. As a community member, I want non-Luma links skipped with a summary, so that mixed roundups do not break import.
22. As a community member, I want truncated Luma URLs resolved where possible, so that social-post links still ingest.

### Supplementary — calendar (optional)

23. As a community member, I want optional Google Calendar read access as a backup signup detector for open-registration events when Gmail is not connected.
24. As a community member, I want calendar sync to ignore non-Luma events.

### Security & implementation

25. As a signed-in user, I want only my own OAuth tokens stored for my account.
26. As a developer/maintainer, I want ingestion to reuse the existing Luma URL metadata fetch pipeline.
27. As a developer/maintainer, I want deduplication by normalized Luma URL across all ingestion paths.
28. As a developer/maintainer, I want all sync and ingest to flow through the server-side Event API as one test seam.
29. As a developer/maintainer, I want OAuth tokens encrypted at rest and sync jobs idempotent.

## Implementation Decisions

### Product scope (locked)

- **Goal:** populate the shared feed — from personal Luma signups and from discovered events — for the whole group; friends use **Accept / Pass** for interest.
- **No source differentiation in product:** signup sync, bulk import, and manual paste all produce the same feed item. No badges, tabs, or copy that distinguish “friend signup” vs “SF pick” vs “manual.”
- **Not MVP:** Luma host approval status (pending / waitlist / going); exposing ingestion source to users.
- **Accept / Pass unchanged** — primary social signal.
- **Clerk remains identity provider** — Gmail (and optional Calendar) are additional connections per user.

### Ingestion paths (implementation only — not user-facing)

All paths call the same **ingest event** pipeline and dedupe on normalized Luma URL:

| Path | Trigger | Result |
|------|---------|--------|
| Gmail sync | Luma registration email in member's inbox | Event added to shared feed |
| Bulk URL import | Paste roundup URL or raw text | One or more events added |
| Manual paste | Existing ingest modal | Event added |
| Calendar read (optional) | Luma calendar invite detected | Event added (incomplete alone for pending signups) |

Internal logging may record ingestion channel for debugging; it is not shown in the UI.

### Gmail sync (required for complete personal signup coverage)

- Gmail read-only scans Luma registration emails (all signup types including require-approval and waitlist).
- Extract event URL → existing metadata fetch → upsert Event (dedupe on URL).
- Set `addedByUserId` to the syncing member when the event is new (existing field; optional subtle attribution only if already used elsewhere — no new source labels).

### Bulk URL import

- Authenticated endpoint: `{ url }` or `{ text }` → extract Luma URLs → ingest each → same Event rows as every other path.
- No X API for MVP; Thread Reader / newsletter pages acceptable.

### Data model

**No new user-facing entities for source or signup status.**

Reuse existing:

```
Event — unchanged shape; unique luma_url; addedByUserId optional
Accept — interested among friends (unchanged)
Pass — not interested among friends (unchanged)
User — add encrypted Gmail (and optional Calendar) tokens + sync metadata
```

Optional internal table for sync idempotency only (not exposed in feed API):

```
IngestionCursor or SyncSeen
  - userId, externalId (email message id or calendar uid), eventId, ingestedAt
```

Do **not** add `sourceKind`, `Signup` display lists, or Luma approval status fields for MVP.

### Feed presentation

Each card shows:

- Event metadata (unchanged)
- **Who is interested / who passed** (Accept / Pass) — **only social signal**
- Accept / Pass actions (unchanged)
- Link to Luma (unchanged)

Do **not** show: signup vs discovery badges, “registered on Luma” lists separate from Accept, or approval status.

### Sync orchestration

- Periodic + manual Gmail scan per connected user → ingest new events into shared feed.
- Optional calendar pass for connected users.
- Idempotent; normalized URL dedupe.

### API contracts (additive)

- `POST /api/connections/gmail` / callback, `DELETE`, `GET /api/connections/status`
- `POST /api/sync/run`
- `POST /api/events/ingest/bulk` — body `{ url }` or `{ text }` → import summary (count added, skipped)
- `GET /api/events` — **unchanged feed shape** for social layer (accepts / passes); no new signup or source fields
- Existing `POST /api/events/ingest`, accept, pass unchanged

### Test seam

**Server-side Event API + sync orchestration entrypoint** — mock Gmail and Luma fetch; assert events appear in shared feed and Accept/Pass still work.

## Testing Decisions

### What makes a good test

- Assert events appear in feed at the API boundary after sync or bulk import; assert dedupe; assert Accept/Pass unchanged.
- No tests for source labels or signup-vs-discovery UI (none exist).

### Behaviors to test

1. Gmail registration email (including pending-approval) → one Event in feed; re-sync does not duplicate.
2. Bulk text with multiple `lu.ma` URLs → N events in feed.
3. Same URL via Gmail and bulk import → one Event.
4. Accept/Pass on auto-ingested events behaves like manually ingested events.

### Prior art

- Existing `events-service` integration tests (ingest, accept) with mocked Luma fetch.

## Out of Scope

- Differentiating ingestion source in UI or API (signup vs SF pick vs manual)
- Luma host approval status and status transition logic
- Separate “who signed up on Luma” lists on cards (distinct from Accept)
- Luma Plus host API / webhooks
- Partiful, Eventbrite (skip during bulk import)
- Automated X/Twitter API scraping
- Replacing official Luma RSVP
- Separate feed tabs by source
- Auto Accept when signup detected
- Groups / multi-tenant feeds

## Further Notes

### Why Gmail for personal signups

Calendar invites alone miss require-approval and waitlist signups until the host approves. Gmail registration emails fire on every signup — needed to populate the feed with all events a person signed up for.

### Product clarifications (2026-07-06)

1. Luma acceptance status is nice-to-have later, not MVP.
2. Primary social signal is Accept / Pass, not Luma RSVP state.
3. **Sources do not matter to users** — only outcome: events from one person or from discovery reach the whole group.

### Recommended build order

1. Gmail connect + sync → ingest into shared feed
2. Bulk URL import → same ingest pipeline
3. Settings: connect Gmail, sync now, errors
4. Optional: Calendar read as backup
5. Future: Luma approval status or source analytics (internal only) if ever needed

### References

- ADR-0001: Shared Luma event feed architecture
- Luma help: Event registration process, Waitlist
