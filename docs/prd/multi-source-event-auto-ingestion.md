## Problem Statement

Community members discover and register for Luma events independently, but the shared feed still depends on manually pasting each event URL. That friction means many signups never appear for friends. Calendar-based detection alone is insufficient: when an event requires host approval or uses a waitlist, Luma does not send a calendar invite until the guest is approved, so pending and waitlisted registrations are invisible to calendar sync. Friends therefore only see events a member has already been accepted into—not the full set of events they signed up for. Separately, curated SF event roundups (e.g. weekly posts on X) are a rich discovery source, but those links are not ingested automatically either.

## Solution

Extend the shared event feed with **multi-source auto-ingestion** that distinguishes three independent signals per member per event:

1. **Luma registration status** — did the member sign up on Luma, and are they pending, waitlisted, or going (host-approved)?
2. **In-app Accept** — is the member interested among friends (existing social signal)?
3. **In-app Pass** — has the member dismissed the event locally among friends (existing social signal)?

Events enter the shared feed through one or more **ingestion sources** (Gmail sync, Google Calendar sync, curator URL import, manual paste). Each source is tagged so the UI can distinguish “Tony signed up on Luma” from “curated SF pick this week.” A background sync job reconciles Luma registration status over time—especially the transition from pending/waitlist to going when a calendar invite or approval email arrives.

The feed remains a **single tab** showing all events; each card surfaces who is going on Luma, who is still pending, who is interested in-app, and who passed in-app.

## User Stories

1. As a community member, I want events I register for on Luma to appear in the shared feed automatically, so that I do not have to copy-paste links after every signup.
2. As a community member, I want events where I am pending host approval to appear in the feed, so that friends know I applied even before I am accepted.
3. As a community member, I want events where I am on a Luma waitlist to appear in the feed with waitlist status, so that friends see I am queued for a spot.
4. As a community member, I want my Luma registration status to update to “going” when the host approves me, so that the feed reflects when I am officially in.
5. As a community member, I want my Luma registration status to update if I am declined, so that friends are not misled into thinking I am still attending.
6. As a community member, I want to connect my Gmail account once, so that Luma registration confirmation emails can be detected without manual action per event.
7. As a community member, I want to connect Google Calendar read access once, so that Luma calendar invites can confirm when I am going on Luma.
8. As a community member, I want a clear explanation of why Gmail and Calendar access are needed before OAuth, so that I trust the permission request.
9. As a community member, I want to disconnect Gmail or Calendar sync from settings, so that I can revoke access if I change my mind.
10. As a community member, I want auto-ingested events to show who registered on Luma and their Luma status (pending, waitlist, going), so that I can see the full picture beyond in-app Accept.
11. As a community member, I want to still use in-app Accept to signal interest among friends, so that social coordination remains separate from official Luma RSVP.
12. As a community member, I want to still use in-app Pass to hide events I am not interested in among friends, so that my local dismissals remain private to the social layer.
13. As a community member, I want event cards to show both Luma registration status and in-app interest side by side, so that I can tell “signed up on Luma but hasn’t said interested yet” from “interested among friends but not registered.”
14. As a community member, I want duplicate Luma URLs from different sources to merge into one feed item, so that the same event does not appear twice.
15. As a community member, I want auto-ingested events to use the same metadata (title, date, cover, location, host) as manually pasted events, so that cards look consistent.
16. As a community member, I want events ingested from a curator link to be labeled as curated discovery, so that I know they are community picks rather than someone’s personal signup.
17. As a community member, I want an admin or power user to paste a curator URL (e.g. a weekly SF events post) and bulk-import Luma links, so that the feed is populated with local discovery without scraping X directly on day one.
18. As a community member, I want curator import to extract all `lu.ma` URLs from the pasted page text, so that one link can add many events at once.
19. As a community member, I want curator import to skip or report non-Luma links, so that mixed-platform roundups do not break ingestion.
20. As a community member, I want curator import to resolve truncated Luma URLs where possible, so that shortened links in social posts still ingest correctly.
21. As a community member, I want open-registration Luma events (no approval, no waitlist) to appear as “going” immediately when detected via calendar invite, so that auto-approved signups are accurate on first sync.
22. As a community member, I want the sync job to run periodically in the background, so that new signups and approval transitions appear without manual refresh.
23. As a community member, I want to trigger a manual “sync now” from settings, so that I can pull latest registrations on demand.
24. As a community member, I want sync failures to be visible in settings with a retry option, so that I am not left uncertain when OAuth tokens expire.
25. As a community member, I want events I signed up for before connecting Gmail to remain addable via manual paste, so that historical events are not lost.
26. As a community member, I want the shared feed to remain friends-only for viewing and syncing controls, so that ingestion credentials are not exposed publicly.
27. As a community member, I want to see which friend added or synced an event into the feed when known, so that attribution remains clear.
28. As a community member, I want pending Luma registrations to show a distinct visual state from going, so that I can scan who is still waiting on host approval.
29. As a community member, I want waitlisted registrations to show a distinct visual state from pending approval, so that the two Luma states are not conflated.
30. As a community member, I want the attendee section on a card to group people by Luma status and in-app interest, so that one glance shows going vs pending vs interested vs passed.
31. As a community member, I want to open event detail and see the full breakdown of friends’ Luma and in-app statuses, so that I can decide whether to register myself.
32. As a community member, I want a link to the original Luma event page on every auto-ingested card, so that I can RSVP officially there.
33. As a signed-in user, I want my display name and avatar shown next to my Luma registration status, so that friends recognize me.
34. As a signed-in user, I want only my own Gmail and Calendar tokens stored for my account, so that other members cannot read my inbox or calendar.
35. As a developer/maintainer, I want ingestion to reuse the existing Luma URL metadata fetch pipeline, so that auto-ingested events behave like manually pasted ones.
36. As a developer/maintainer, I want Luma event identity deduplicated by normalized URL and optional Luma calendar UID, so that Gmail-detected and calendar-detected signups merge cleanly.
37. As a developer/maintainer, I want Gmail parsing to recognize Luma sender domains and registration email patterns, so that confirmation and approval emails are classified reliably.
38. As a developer/maintainer, I want calendar parsing to recognize Luma invites by organizer domain and iCal UID pattern, so that non-Luma calendar events are ignored.
39. As a developer/maintainer, I want sync logic to treat calendar invite appearance as the signal for pending → going transition, so that approval detection does not require guessing.
40. As a developer/maintainer, I want an optional fallback read of the member’s Luma iCal subscription calendar in Google Calendar for pending/waitlist detection when Gmail is unavailable, so that there is a secondary path with known refresh lag.
41. As a developer/maintainer, I want all sync and ingest operations to flow through the server-side Event API boundary, so that integration tests have a single seam.
42. As a developer/maintainer, I want OAuth tokens encrypted at rest, so that Gmail and Calendar credentials are stored securely.
43. As a developer/maintainer, I want sync jobs to be idempotent, so that re-running sync does not create duplicate registrations or events.
44. As a developer/maintainer, I want observability on sync runs (last success, events added, status updates), so that failures can be diagnosed.
45. As a community member, I want the single feed tab to remain the primary view without separate “accepted only” or “curated only” tabs for MVP of this feature, so that discovery and personal signups live in one place with clear labels.

## Implementation Decisions

### Product scope (locked for this PRD)

- **Goal:** eliminate manual paste as the only path; show all Luma signups including pending/waitlist; show Luma going vs in-app Accept/Pass as separate layers.
- **In-app Accept and Pass semantics unchanged** — they remain the friends-only social layer; they do not replace Luma RSVP.
- **Single feed tab** — no separate tabs for curated vs personal; use labels and grouped attendee states on cards.
- **Clerk remains identity provider** — Gmail and Google Calendar are additional OAuth connections stored per user, not a replacement for Clerk sign-in.

### Ingestion sources (priority order)

| Source | Detects | Limitation |
|--------|---------|------------|
| **Gmail (read-only)** | Signup confirmation emails; pending, waitlist, and auto-approved going | Gmail users only; parser maintenance |
| **Google Calendar (read-only)** | Luma calendar invites when guest is going; organizer `@lu.ma`, UID `@events.lu.ma` | Misses pending/waitlist until approved |
| **Curator URL import** | Bulk `lu.ma` links from pasted roundup page text | Discovery only, not personal signups; may be partial for X Articles |
| **Manual URL paste** | Any event (existing) | Fallback; friction remains |
| **Luma iCal subscription (optional fallback)** | Registered events including pending/waitlist via subscribed calendar | 12–24h refresh lag on Google Calendar |

**Explicitly not in scope:** Luma host API / webhooks (requires Luma Plus; calendar-scoped; host-only guest lists—not attendee registrations across Luma).

### Luma registration status model

New persisted entity linking **User + Event** with Luma-specific state, separate from `accepts` and `passes`:

```
LumaRegistration
  - id
  - userId
  - eventId
  - lumaStatus: pending | waitlist | going | declined
  - lumaEventUid (optional, e.g. evt-xxx@events.lu.ma) — dedupe key
  - detectedVia: gmail | calendar | ical_subscription | curator_import | manual
  - sourceLabel (optional, e.g. curator name or "michelle-sf")
  - firstDetectedAt
  - lastSyncedAt
  - unique (userId, eventId)
```

Status state machine (per user per event):

```
(none)
  │ Gmail / iCal subscription / manual signup record
  ▼
pending | waitlist | going   (going immediately if open registration + calendar invite on signup)
  │ Calendar invite or approval email
  ▼
going
  │ Decline email or removal from Luma feeds
  ▼
declined
```

Calendar-only sync must **not** create a registration row by itself when no prior signup exists unless calendar detection includes accepted attendee status for the syncing user (open events). When calendar invite appears for an event already in `pending` or `waitlist`, upgrade to `going`.

### Event source attribution

Extend **Event** (or parallel metadata) with ingestion provenance:

```
Event (existing fields unchanged)
  + ingestionKind: manual | user_sync | curator_import
  + sourceLabel (optional)
  + addedByUserId (existing)
```

Curator-imported events have `ingestionKind: curator_import` and do **not** imply any member registered on Luma unless a separate `LumaRegistration` row exists for that user.

### Gmail detection rules

- Scope: `gmail.readonly` (or narrower if feasible with Pub/Sub push later).
- Match senders: `@luma-mail.com`, `@calendar.luma-mail.com`, `support@luma.com`, and related Luma domains.
- Parse subject/body for: event title hints, `lu.ma/` and `luma.com/` URLs, status keywords (pending, waitlist, approved, going, declined).
- Resolve `luma.link` short redirects to canonical event URL before ingest.
- On new registration email: upsert Event (via existing metadata fetch) + create/update `LumaRegistration` with appropriate status.
- On approval email: update `LumaRegistration.lumaStatus` → `going`.

### Google Calendar detection rules

- Scope: `calendar.events.readonly` on primary and relevant subscribed calendars.
- Identify Luma events: organizer email ends with `@lu.ma` OR `iCalUID` contains `@events.lu.ma` OR description/location contains Luma URLs (weaker tier—prefer organizer/UID).
- Confirm user is going: attendee `responseStatus === accepted` for syncing user’s email, or equivalent ICS `PARTSTAT=ACCEPTED`.
- Extract public or join URL from description, location, or source fields; normalize via existing URL normalization.
- Match to existing `LumaRegistration` by `lumaEventUid` or normalized `lumaUrl`; upgrade status to `going` when invite detected.

### Curator URL import

- MVP: authenticated POST with `{ curatorUrl }` or `{ rawText }` — server fetches URL HTML/text (where allowed), extracts Luma URL regex matches, dedupes, runs existing ingest for each URL, marks events `ingestionKind: curator_import`.
- Do **not** depend on authenticated X API or brittle X scraping for MVP; pasted Thread Reader URLs or newsletter pages are acceptable inputs.
- Truncated URLs: attempt HEAD/GET redirect resolution; skip unresolvable slugs with logged warning.
- Non-Luma links: skip with summary count in response.

### User connection storage

Extend **User** with encrypted OAuth fields for sync providers:

```
User (existing)
  + gmailConnected: boolean
  + gmailRefreshToken (encrypted)
  + googleCalendarReadConnected: boolean
  + googleCalendarRefreshToken (encrypted)
  + lastSyncAt (optional)
  + lastSyncError (optional)
```

Separate from any legacy calendar **write** token used for Accept → Google Calendar create (remains deferred/not wired).

### Sync orchestration

- Background job (scheduled cron or queue) per connected user: run Gmail scan since last cursor, then Calendar scan for upcoming window (e.g. 90 days).
- Manual `POST /api/sync/run` for signed-in user.
- Idempotent upserts on Event and LumaRegistration.
- Store Gmail historyId or internal message cursor for incremental sync.

### API contracts (conceptual, additive)

- `POST /api/connections/gmail` / callback — connect Gmail read
- `POST /api/connections/google-calendar` / callback — connect Calendar read
- `DELETE /api/connections/gmail` — disconnect
- `DELETE /api/connections/google-calendar` — disconnect
- `GET /api/connections/status` — connected providers, last sync
- `POST /api/sync/run` — trigger manual sync for current user
- `POST /api/events/ingest/curator` — body: `{ url }` or `{ text }` → bulk import summary
- `GET /api/events` — extend feed payload with per-event `lumaRegistrations[]` grouped summaries and per-viewer `viewerLumaStatus`
- Existing `POST /api/events/ingest`, `POST /api/events/:id/accept`, `POST /api/events/:id/pass` unchanged in semantics

### Feed card presentation

Each event card shows:

- **Luma layer:** avatars/counts for going, pending, waitlist (declined hidden or collapsed)
- **Friends layer:** existing Accept / Pass avatars and counts
- **Provenance badge:** “Curated” vs “Synced from Luma” vs “Added manually”
- **Viewer state:** separate indicators for `viewerLumaStatus`, `viewerAccepted`, `viewerPassed`

### Architectural alignment

- Evolve existing Next.js Event API + InsForge Postgres — no new app boundary.
- Reuse existing Luma public page metadata fetch for all URL-based ingest paths.
- ADR-0001 v2 direction (auto-ingest) fulfilled via Gmail/Calendar attendee path, not Luma host API.

### Proposed test seam (confirm with maintainer)

Use the **server-side Event API plus sync orchestration entrypoint** as the **single test seam** — the highest boundary covering ingest, registration upsert, status transitions, and feed serialization. Mock external Gmail and Google Calendar clients; mock Luma HTML fetch; use real or in-memory database.

Alternative lower seams (avoid unless necessary): separate unit tests for email parsing and calendar UID extraction as pure functions feeding the orchestration layer.

## Testing Decisions

### What makes a good test

- Assert **observable behavior at the API/sync boundary**: given fixtures, feed and registration state match expectations.
- Do not test React component internals or OAuth library wiring directly.
- Use stable fixtures for Gmail messages, calendar event JSON, and Luma HTML — no live network in CI.
- Tests should cover state transitions (pending → going), deduplication, and curator bulk import counts.

### Modules / behaviors to test

1. **Gmail ingest fixture** — registration confirmation → Event created + LumaRegistration `pending`; approval email → status `going`.
2. **Calendar ingest fixture** — Luma invite with accepted attendee → LumaRegistration `going`; non-Luma event ignored.
3. **Combined flow** — Gmail pending first, then calendar invite → single Event, status upgraded, no duplicate rows.
4. **Curator import** — pasted text with multiple `lu.ma` URLs → N events ingested, `ingestionKind: curator_import`, dedupe on second run.
5. **Feed serialization** — `GET /api/events` returns luma registration groups and preserves existing accept/pass behavior.
6. **Idempotency** — repeated sync does not duplicate events or registrations.

### Prior art

- Existing integration tests for `events-service` (ingest, accept) with mocked Luma fetch.
- Existing unit tests for Luma URL normalization and metadata parsing.
- Existing calendar module tests (write path mocks) — extend pattern for read-path detection helpers.

## Out of Scope

- Luma Plus host API, webhooks, or calendar-admin guest lists as ingestion source
- Partiful, Eventbrite, or other non-Luma platforms (except skip during curator import)
- Automated scraping of X/Twitter API or logged-in X content (curator import via pasted URL/text only for MVP)
- Replacing official Luma RSVP — users still register on Luma
- Server-side tracking changes to Pass semantics (pass remains friends-layer dismiss)
- Separate feed tabs for curated vs personal vs accepted-only
- Apple Calendar, Outlook, or non-Gmail email providers (future)
- Real-time sub-minute sync (periodic sync is sufficient for MVP)
- Showing other guests’ private Luma join links
- Auto in-app Accept when Luma going is detected (remain independent unless product decides otherwise later)
- Groups, multi-tenant feeds, or invite-link gating

## Further Notes

### Why calendar alone is insufficient

Luma sends calendar invites on signup only for **open registration** (no require-approval, no waitlist). For require-approval and waitlist events, confirmation email is sent without calendar invite; invite arrives only after host approval. Therefore calendar read sync captures **going** but misses **pending/waitlist** unless supplemented by Gmail or Luma personal iCal subscription.

### Curator posts (e.g. Michelle Fang SF weekly)

Weekly SF roundup posts are a **discovery** source, not a personal signup source. X Articles may highlight only a subset of events (e.g. 4 picks from 35+); full weekly threads or newsletter pages are better import targets. Label curated events clearly so friends do not confuse curation with personal registration.

### Recommended build order

1. Schema: `LumaRegistration` + user connection fields + event provenance
2. Calendar read detection + status upgrade path (going detection, merges with manual paste)
3. Gmail read detection (pending/waitlist/signup + approval transition)
4. Feed UI: Luma status groups alongside Accept/Pass
5. Settings: connect/disconnect Gmail and Calendar, manual sync
6. Curator URL bulk import
7. Optional: iCal subscription calendar fallback; Gmail push via Pub/Sub

### References

- ADR-0001: Shared Luma event feed architecture (v2 auto-ingest direction)
- Luma help: Event registration process, Waitlist, iCal syncing, Troubleshooting Google Calendar invites
- Prior community pattern: calendar ICS filtering for Luma organizer/UID (luma_notifier)
