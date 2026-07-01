## Problem Statement

People in a community discover events on Luma independently, but there is no shared place to see what others are attending. When someone RSVPs on Luma, that signal stays invisible to everyone else. Each person must manually hunt for events, coordinate in chat, and copy details into their own calendar. There is no lightweight way to browse a communal event feed, see who is going, and add accepted events to Google Calendar in one step.

## Solution

A web app with a single shared event feed sourced from Luma links. Anyone can paste a Luma event URL to add it to the feed. All visitors see the same upcoming events. Each user can **Accept** (recorded publicly as "who's going" and synced to their Google Calendar) or **Pass** (hidden locally, not tracked). The app is web-first so anyone can access it via a URL without installing anything.

## User Stories

1. As a community member, I want to open a web app and see a shared feed of upcoming Luma events, so that I can discover what others are considering without checking multiple channels.
2. As a community member, I want to paste a Luma event URL and add it to the shared feed, so that others can see an event I found or signed up for on Luma.
3. As a community member, I want the app to automatically fetch event details (title, date, time, cover image, location, host) from a pasted Luma link, so that I do not have to enter metadata manually.
4. As a community member, I want to see a preview of the event before it is added to the feed, so that I can confirm the link parsed correctly.
5. As a community member, I want invalid or non-Luma URLs to show a clear error, so that I know why ingestion failed.
6. As a community member, I want event cards to show cover image, title, date/time, host, and location, so that I can decide quickly whether to attend.
7. As a community member, I want to tap **Accept** on an event card, so that I signal I am going and others can see me in the attendee list.
8. As a community member, I want to tap **Pass** on an event card, so that I can dismiss events I am not interested in without affecting what others see.
9. As a community member, I want passed events to disappear from my view only, so that the shared feed remains unchanged for others.
10. As a community member, I want to see an avatar stack and count of people who accepted an event, so that I can use social proof when deciding whether to go.
11. As a community member, I want to tap the attendee preview to see the full list of people going, so that I can see which friends are attending.
12. As a community member, I want the attendee list to show only accepts (not passes), so that rejections stay private.
13. As a community member, I want to see "Be the first to go" when no one has accepted yet, so that the empty state feels inviting rather than broken.
14. As a community member, I want my accepted events to be added to my Google Calendar automatically, so that I do not have to copy details manually.
15. As a community member, I want to connect Google Calendar only when I first tap Accept, so that I am not asked for permissions before I have shown intent.
16. As a community member, I want a short explanation of why Google Calendar access is needed before OAuth, so that I trust the permission request.
17. As a community member, I want confirmation after accepting that the event was added to Google Calendar, so that I know the sync succeeded.
18. As a community member, I want to retry or see an error if calendar sync fails after accept, so that I am not left uncertain.
19. As a community member, I want accepted event cards to show a "You're going" state instead of action buttons, so that my decision is visually clear.
20. As a community member, I want a link to view the original event on Luma, so that I can register officially or see full details there.
21. As a community member, I want the feed sorted chronologically (upcoming first), so that the nearest events are easiest to find.
22. As a community member, I want a header showing how many events need my response, so that I know what is pending.
23. As a community member, I want to filter the feed to events I have not acted on yet, so that I can clear my backlog quickly.
24. As a community member, I want skeleton loading cards while events load, so that the page feels responsive.
25. As a community member, I want a clear empty state when no events exist in the feed, so that I know the app is working and can add the first event.
26. As a community member, I want a "You're caught up" state when I have acted on all visible events, so that I feel done rather than confused.
27. As a community member, I want to use the app on mobile in a browser, so that I can check events on the go without an install.
28. As a community member, I want Accept and Pass buttons to be large and thumb-friendly on mobile, so that I can act quickly on a phone.
29. As a community member, I want a bottom tab bar on mobile (Feed, Calendar, My Events), so that I can switch views easily.
30. As a community member, I want a mini calendar sidebar on desktop showing days with events, so that I can orient myself by date.
31. As a community member, I want to click a date on the mini calendar to filter the feed, so that I can focus on a specific day.
32. As a community member, I want a **My Events** view showing only events I accepted, so that I can review my personal schedule in the app.
33. As a community member, I want accepted events to appear as dots or entries on a calendar view, so that I can see my commitments visually.
34. As a community member, I want to open an event detail drawer/sheet with full description and attendee list, so that I can read more without losing my place in the feed.
35. As a community member, I want Accept and Pass actions repeated in the detail drawer, so that I can decide after reading full details.
36. As a first-time visitor, I want to browse the shared feed without signing in, so that I can evaluate the app before connecting Google.
37. As a signed-in user, I want my display name and avatar shown when I accept an event, so that others recognize me in the attendee list.
38. As a signed-in user, I want to sign in with Google (used for both identity and calendar), so that setup is minimal.
39. As a signed-in user, I want to see my Google Calendar connection status in settings or header, so that I know if sync is available.
40. As a signed-in user, I want to disconnect and reconnect Google Calendar from settings, so that I can fix token issues.
41. As an event contributor, I want duplicate Luma URLs to be rejected or deduplicated, so that the feed does not show the same event twice.
42. As a community member, I want relative date labels ("Tomorrow, 7pm") on cards with absolute time on hover, so that scanning is fast but precision is available.
43. As a community member, I want virtual events to show an "Online" label with meeting link when available, so that I know how to join.
44. As a community member, I want free vs paid events indicated when metadata is available, so that I can filter mentally before clicking through.
45. As a community member, I want the app to feel clean and trustworthy (Luma/Eventbrite aesthetic, not party-app styling), so that professional community events feel appropriate.
46. As a developer/maintainer, I want Luma URL ingestion to work without a Luma API key for MVP, so that we can ship quickly using Open Graph metadata.
47. As a developer/maintainer, I want shared event and accept data persisted server-side, so that all users see the same feed and attendee lists.
48. As a developer/maintainer, I want the app deployable to a public URL (e.g. Vercel), so that the community can access it without local setup.

## Implementation Decisions

### Product scope (locked)

- **Luma only** — Partiful and other platforms are out of scope for MVP.
- **No groups** — one global shared feed for everyone; group invites and multi-tenant feeds are deferred.
- **Accept tracking only** — persist accepts server-side for "who's going"; passes are client-local hide with no server record.
- **Google Calendar only** — sync on accept to the accepting user's calendar; no Apple/Outlook for MVP.
- **Web app** — Next.js, responsive, deployable; no native mobile app.

### Replace prototype domain model

The existing prototype uses a local-only `Event` model with draft/scheduled/distributed workflow, distribution channels (email/slack/teams/sms), and recipients. The MVP replaces this with:

```
Event (shared, server-persisted)
  - id
  - lumaUrl (unique)
  - title, description, coverImageUrl
  - startAt, endAt (ISO timestamps)
  - location (string), isOnline (boolean), meetingUrl (optional)
  - hostName, hostAvatarUrl (optional)
  - addedByUserId (optional)
  - createdAt

Accept (server-persisted)
  - id
  - eventId
  - userId
  - googleCalendarEventId (optional, for updates)
  - acceptedAt

User (server-persisted)
  - id
  - email, name, avatarUrl
  - googleCalendarConnected (boolean)
  - googleRefreshToken (encrypted server-side)
```

Per-card UI state (from UX research prototype):

```
pending ──Accept──► accepting ──success──► accepted
   │                      │
   │                      └──fail──► pending + error toast
   └──Pass──► passed (client-local hide only)

accepted ──Undo (optional 5s)──► pending
passed ──Undo (optional 5s)──► pending
```

### Architecture

- **Evolve the existing Next.js App Router app** rather than starting a new repo.
- Introduce a **server-side Event API** as the single application boundary for shared state. All feed reads, Luma ingestion, accept recording, and attendee queries go through this layer.
- **Client reject/pass** remains in browser session storage or equivalent local state — not persisted server-side for MVP.
- **Authentication**: Google OAuth with incremental authorization — base sign-in for identity; Calendar write scope requested on first Accept only.
- **Persistence**: server database required for shared feed and accepts (SQLite/Postgres via an ORM — choice left to implementer; must support deployment on Vercel or equivalent).
- **Luma ingestion (MVP)**: server-side fetch of public Luma event page → extract Open Graph tags (`og:title`, `og:description`, `og:image`) and JSON-LD if present. Validate URL matches Luma patterns (`lu.ma/*`, `luma.com/event/*`). No Luma API key required for MVP.
- **Luma ingestion (v2, out of scope here)**: Luma Plus API + webhooks for auto-ingest when a member RSVPs on Luma.

### UI modules (conceptual)

- **Shared feed page** — chronological event cards with Accept/Pass, attendee stack, pending count header.
- **Add event flow** — URL paste input → preview → confirm add to feed.
- **Event detail sheet** — full metadata, attendee drawer, repeated actions, Luma external link.
- **My Events view** — user's accepted events only.
- **Calendar views** — mini calendar sidebar (desktop), calendar tab (mobile), dots on days with events.
- **Calendar connect modal** — just-in-time on first Accept; value prop + Google OAuth popup.
- **Settings** — Google Calendar connection status, disconnect/reconnect.

### UI design direction (from research)

- Feed-first layout; calendar secondary.
- Card hierarchy: cover image → title → date/time → host → location → who's going → actions.
- Inline **Accept** (primary) and **Pass** (ghost/neutral — not red/destructive).
- Avatar stack max 4–5 with `+N` overflow; hide social proof until ≥2 accepts.
- Skeleton cards for loading; distinct empty states for "no events" vs "caught up".
- Color palette: clean/trustworthy (white/off-white background, blue primary CTA, green for accepted state only).

### API contracts (conceptual)

- `POST /api/events/ingest` — body: `{ lumaUrl }` → returns parsed preview or created event
- `GET /api/events` — returns shared feed (upcoming, chronological)
- `POST /api/events/:id/accept` — records accept, triggers Google Calendar create, returns updated attendee list
- `GET /api/events/:id/accepts` — returns accept list for social proof
- `GET /api/auth/google` / callback — OAuth for sign-in and calendar scope

### Remove from prototype

- Distribution channels (email/slack/teams/sms) and DistributionModal simulation
- Draft/scheduled/distributed status workflow
- Manual event form as primary creation path (replaced by Luma URL paste)
- localStorage as source of truth for shared events

## Testing Decisions

### Proposed test seam (confirm with maintainer)

Use the **server-side Event API** as the single test seam — the highest boundary that covers ingestion, shared feed, accept persistence, and calendar sync orchestration. UI tests are secondary.

- **Integration tests** hit API route handlers with:
  - Mocked Luma metadata fetch (fixed HTML/OG response)
  - Mocked Google Calendar client (verify create called on accept with correct event fields)
  - Real or in-memory database for events and accepts
- **Do not** unit-test React component internals or hook implementation details.
- **Do test** observable behavior: given a valid Luma URL, feed returns one event; given an accept, attendee count increments and calendar client receives correct payload; given duplicate URL, ingest rejects; given invalid URL, ingest returns error.
- **Client pass behavior**: optional lightweight test that passed event IDs are stored in session storage and filtered from rendered feed — can be a small browser-level or component test at the feed filter boundary only.

**Prior art**: the current codebase has no automated tests. This PRD establishes the testing pattern for the new Event API layer.

### What makes a good test

- Assert inputs and outputs at the API boundary, not internal function calls.
- Use stable fixtures for Luma HTML responses rather than live network calls.
- One test file per major API concern (ingest, feed, accept) is sufficient for MVP.

## Out of Scope

- Partiful or any non-Luma event platform
- Groups, invite links, or multi-tenant feeds
- Server-side tracking of rejects/passes
- Apple Calendar, Outlook, or CalDAV sync
- Luma API / webhook auto-ingest (v2)
- Native mobile apps
- Email notifications or Slack integration
- Luma checkout/RSVP replacement (users still register on Luma officially)
- Paywalled attendee lists
- Swipe-only interaction without button fallback on web
- OAuth or calendar permission prompts on first page load
- Maybe/interested third RSVP state
- Showing who passed or reject counts

## Further Notes

- Existing repo: `tony-ng-vn/event-distributor` on GitHub; prototype runs locally with localStorage.
- UX research completed for feed layout, accept/reject patterns, Google Calendar JIT OAuth, Luma card metadata priority, and skeleton/empty states.
- Luma public API (`https://public-api.luma.com`) requires Luma Plus and calendar-scoped API keys — not needed for URL-paste MVP.
- Recommended build order: (1) Luma URL ingest + shared feed, (2) Accept/Pass UI, (3) Google OAuth + calendar sync on accept, (4) attendee social proof, (5) calendar views and polish, (6) deploy to public URL.
- Open Graph extraction may break if Luma changes page structure — monitor and add JSON-LD parsing as fallback.
