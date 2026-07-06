## Problem Statement

Community members discover and register for Luma events independently, but the shared feed still depends on manually pasting each event URL. Friends cannot see what events someone signed up for unless that person remembers to paste the link. Separately, many SF events exist each week (curated roundups, newsletters, posts) that friends might never encounter. The core gap is **visibility**: everyone should see the same pool of relevant events, and among friends, who is **interested in going** or **not interested** — without anyone copy-pasting links after every Luma signup.

Whether Luma's host has approved a registration (pending vs waitlist vs going) is useful context but **not** the problem we are solving first.

## Solution

A **single shared feed** populated from two kinds of events:

1. **Personal signups** — events a member registered for on Luma, detected automatically (primarily via Gmail) and added to the feed.
2. **SF discovery** — events happening in SF ingested from curated roundup links (e.g. weekly posts), so the group sees things nobody signed up for yet.

On each event card, the **social layer** (existing Accept / Pass) is the main signal friends care about: who is interested in going, who is not, who has not weighed in. Auto-ingest only answers “this event exists and someone signed up for it” or “this event exists in SF this week” — it does not replace Accept/Pass and does not track Luma host approval status for MVP.

Manual URL paste remains a fallback.

## User Stories

### Core — event visibility

1. As a community member, I want events I register for on Luma to appear in the shared feed automatically, so that I do not have to copy-paste links after every signup.
2. As a community member, I want events I signed up for to appear even when the host has not approved me yet, so that friends see what I applied for — not only events I was accepted into.
3. As a community member, I want to see all events my friends signed up for on Luma, so that I can discover what they are considering.
4. As a community member, I want SF events from weekly curated roundups imported into the feed, so that I see happenings I might have missed even if nobody signed up yet.
5. As a community member, I want duplicate Luma URLs to merge into one feed item, so that the same event does not appear twice.
6. As a community member, I want auto-ingested events to show the same metadata (title, date, cover, location, host) as manually pasted events, so that cards look consistent.
7. As a community member, I want a link to the original Luma event page on every card, so that I can register officially there.
8. As a community member, I want to see which friend caused an event to appear when they signed up on Luma, so that attribution is clear.
9. As a community member, I want curator-imported events labeled as discovery (not a personal signup), so that I know nobody in the group registered yet.
10. As a community member, I want events I signed up for before connecting sync to remain addable via manual paste, so that history is not lost.

### Core — social interest (existing behavior, unchanged)

11. As a community member, I want to tap **Accept** to signal I am interested in going, so that friends see me in the interested list.
12. As a community member, I want to tap **Pass** to signal I am not interested, so that friends see who is out without affecting the shared event list.
13. As a community member, I want event cards to show who is interested and who passed among friends, so that social coordination is the primary decision signal.
14. As a community member, I want the attendee preview to show interested friends (Accept) and optionally who passed, so that I can use social proof when deciding.
15. As a community member, I want Accept and Pass to remain independent of Luma RSVP, so that saying “interested” here does not mean I registered on Luma.
16. As a community member, I want one feed tab for all events — signups and SF discovery together — so that I do not switch views to see the full picture.

### Auto-ingest — Gmail (primary signup detection)

17. As a community member, I want to connect Gmail once, so that Luma registration emails add events to the feed without manual action.
18. As a community member, I want a clear explanation of why Gmail access is needed before OAuth, so that I trust the permission request.
19. As a community member, I want to disconnect Gmail sync from settings, so that I can revoke access.
20. As a community member, I want signup detection to work for require-approval and waitlist events (not only open registration), so that the feed is complete.
21. As a community member, I want the sync job to run periodically, so that new signups appear without manual refresh.
22. As a community member, I want to trigger “sync now” from settings, so that I can pull latest signups on demand.
23. As a community member, I want sync failures visible in settings with retry, so that expired tokens are recoverable.

### Auto-ingest — SF curation

24. As a community member, I want to paste a curator URL (e.g. a weekly SF events thread or newsletter page) and bulk-import Luma links, so that many SF events enter the feed at once.
25. As a community member, I want curator import to extract all `lu.ma` URLs from the page text, so that one paste adds many events.
26. As a community member, I want non-Luma links skipped with a summary, so that mixed roundups do not break import.
27. As a community member, I want truncated Luma URLs resolved where possible, so that social-post links still ingest.

### Supplementary — calendar (optional, not required for MVP)

28. As a community member, I want the option to connect Google Calendar read access, so that open-registration signups can be detected via calendar invite as a backup to Gmail.
29. As a community member, I want calendar sync to ignore non-Luma events, so that work meetings do not appear in the feed.

### Security & implementation

30. As a signed-in user, I want only my own Gmail tokens stored for my account, so that others cannot read my inbox.
31. As a developer/maintainer, I want ingestion to reuse the existing Luma URL metadata fetch pipeline, so that auto-ingested events behave like manual paste.
32. As a developer/maintainer, I want deduplication by normalized Luma URL, so that Gmail-detected and curator-detected events merge cleanly.
33. As a developer/maintainer, I want all sync and ingest to flow through the server-side Event API, so that integration tests have one seam.
34. As a developer/maintainer, I want OAuth tokens encrypted at rest.
35. As a developer/maintainer, I want sync jobs idempotent, so that re-runs do not duplicate events or signup records.

## Implementation Decisions

### Product scope (locked)

- **Primary goal:** everyone sees events friends signed up for + SF discovery events; friends mark **interested (Accept)** or **not interested (Pass)**.
- **Not MVP:** tracking Luma host approval state (pending / waitlist / going / declined). That may come later as a nice-to-have badge — it is explicitly deprioritized.
- **In-app Accept and Pass unchanged** — they are the main social signal; auto-ingest only surfaces events.
- **Single feed tab** — personal signups and SF curation together; distinguish with a small provenance label (“Signed up by Tony” vs “SF pick”).
- **Clerk remains identity provider** — Gmail OAuth is an additional connection per user.

### Two ways events enter the feed

| Entry type | Meaning | Primary source |
|------------|---------|----------------|
| **Personal signup** | A member registered on Luma | Gmail (registration confirmation emails) |
| **SF discovery** | Event exists in SF; nobody in group may have signed up | Curator URL bulk import |
| **Manual** | Someone pasted a link | Existing ingest flow |

### Signup detection (Gmail-first)

- **Gmail read-only** is the **required** path for complete signup detection — it fires on every Luma registration email, including require-approval and waitlist, before any calendar invite.
- Parse Luma sender domains; extract `lu.ma` / `luma.com` URLs; resolve `luma.link` redirects; upsert Event via existing metadata fetch.
- Record a simple **Signup** link (user signed up for this event) — no host-approval status field for MVP.

```
Signup (new, lightweight)
  - id
  - userId
  - eventId
  - detectedVia: gmail | calendar | manual
  - detectedAt
  - unique (userId, eventId)
```

- **Google Calendar read (optional supplement):** detect Luma calendar invites for open-registration events when Gmail is not connected. Calendar alone is **insufficient** for full signup coverage (misses pending/waitlist until host approves) — document this limitation; do not build approval-state logic on top of calendar for MVP.

### SF curator import

- Authenticated POST with `{ url }` or `{ text }` — fetch or parse text, regex extract Luma URLs, bulk ingest, mark events as discovery-sourced.
- No X API / logged-in scraping for MVP; pasted Thread Reader or newsletter URLs are fine.
- Discovery events do not create Signup rows unless a member later registers on Luma.

### Event provenance (minimal)

```
Event (existing fields)
  + sourceKind: manual | signup_sync | sf_discovery
  + sourceLabel (optional, e.g. "michelle-sf-week")
  + addedByUserId (existing — set when signup sync or manual)
```

### Feed presentation

Each card shows:

- Event metadata (unchanged)
- **Who signed up on Luma** (avatars from Signup rows) — “registered for this”
- **Who is interested / who passed** (existing Accept / Pass) — **primary social signal**
- Small badge: “SF pick” vs “Friend signed up” vs “Added manually”
- No pending/waitlist/going breakdown for MVP

### User connection storage

```
User (existing)
  + gmailConnected, gmailRefreshToken (encrypted)
  + googleCalendarReadConnected, googleCalendarRefreshToken (encrypted, optional)
  + lastSyncAt, lastSyncError
```

### Sync orchestration

- Periodic + manual sync: scan Gmail since last cursor for new Luma registration emails → upsert Event + Signup.
- Optional calendar pass for users who connected it — add Signup rows only, same as Gmail path.
- Idempotent; dedupe on normalized URL.

### API contracts (additive)

- `POST /api/connections/gmail` / callback, `DELETE`, `GET /api/connections/status`
- `POST /api/sync/run` — manual sync
- `POST /api/events/ingest/curator` — bulk SF import
- `GET /api/events` — extend with `signups[]` (who registered on Luma) alongside existing `accepts` / `passes`
- Existing ingest, accept, pass endpoints unchanged

### Test seam

**Server-side Event API + sync orchestration entrypoint** — single integration boundary. Mock Gmail (and optional Calendar); mock Luma HTML fetch; assert feed contains events and signup/interested lists.

## Testing Decisions

### What makes a good test

- Assert feed and signup state at the API boundary — not React internals or OAuth wiring.
- Stable fixtures for Luma registration emails and HTML — no live network in CI.

### Behaviors to test

1. Gmail registration email (including pending-approval wording) → Event created + Signup row; no duplicate on re-sync.
2. Curator text with multiple `lu.ma` URLs → N events, `sourceKind: sf_discovery`, no Signup rows.
3. Same URL from Gmail and curator → one Event, both provenance and Signup preserved appropriately.
4. Feed returns signups separate from accepts — a user can sign up on Luma without tapping Accept.
5. Accept/Pass behavior unchanged after auto-ingest.

### Prior art

- Existing `events-service` integration tests (ingest, accept) with mocked Luma fetch.

## Out of Scope

- **Luma host approval status** (pending / waitlist / going / declined) — nice-to-have later, not MVP
- Status transition logic (pending → going via calendar or approval email)
- Separate UI groups for Luma registration states
- Luma Plus host API / webhooks
- Partiful, Eventbrite (skip during curator import)
- Automated X/Twitter API scraping
- Replacing official Luma RSVP
- Separate feed tabs for signups vs discovery vs accepted-only
- Apple Calendar, Outlook, non-Gmail email (future)
- Auto Accept when signup detected
- Groups / multi-tenant feeds

## Further Notes

### Why Gmail is primary (calendar is optional)

Luma sends calendar invites on signup only for **open registration**. Require-approval and waitlist events send a confirmation email **without** a calendar invite until the host approves. For MVP we only need “Tony signed up” — Gmail catches all of those. Calendar is a optional backup for users who skip Gmail and only have open-registration events.

### Clarification from product (2026-07-06)

The must-have is: **see all events I signed up for + SF events I might not know about**, and **see who among friends is interested or not**. Whether Luma accepted my registration is not required for the first ship.

### Recommended build order

1. `Signup` entity + event `sourceKind`
2. Gmail connect + sync + signup detection
3. Feed UI: show who signed up + existing Accept/Pass (unchanged)
4. Curator bulk import for SF discovery
5. Settings: Gmail connect, sync now, status
6. Optional: Calendar read as secondary signup source
7. Future: Luma host approval status as optional enrichment

### References

- ADR-0001: Shared Luma event feed architecture
- Luma help: Event registration process, Waitlist, iCal syncing
- Prior discussion: calendar-only misses pending signups; Gmail required for complete signup list
