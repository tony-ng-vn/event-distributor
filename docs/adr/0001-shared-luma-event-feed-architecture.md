# ADR-0001: Shared Luma event feed architecture

## Status

Accepted

## Date

2026-07-01

## Context

The project began as a local-only **event distributor** prototype: users create events manually, simulate distribution via email/Slack/Teams/SMS, and persist data in browser `localStorage`. That model does not match the product we want to build.

The target product is a **community event radar**: members discover events on Luma independently, but need a shared place to see what others are attending. When someone finds or RSVPs to a Luma event, it should surface on a communal dashboard. Each person can **Accept** (visible to others as "who's going" and synced to their own Google Calendar) or **Pass** (hidden locally only).

Constraints and preferences established in discussion:

- **Luma only** for MVP — ignore Partiful and other platforms initially.
- **No groups** for MVP — one global shared feed for everyone; multi-tenant groups deferred.
- **Accept tracking only** — persist accepts server-side so the group sees who is going; do not record passes.
- **Google Calendar only** — sync to the accepting user's calendar; no Apple/Outlook for MVP.
- **Web-first** — responsive Next.js app deployable to a public URL; no native app.
- **Fast MVP path** — URL paste ingestion before Luma API/webhook integration.
- **Browse without sign-in** — authentication required only when accepting (and connecting Google Calendar).

The existing codebase (`Next.js` App Router, React, TypeScript, Tailwind) is a reasonable foundation but its domain model, persistence layer, and UI flows must be replaced rather than extended.

Related artifact: [PRD — Shared Luma Event Feed MVP](../prd/shared-event-feed-mvp.md) (GitHub issue [#1](https://github.com/tony-ng-vn/event-distributor/issues/1)).

## Decision

Evolve the existing Next.js application into a **server-backed shared event feed** with the following architecture.

### 1. Single application boundary: server-side Event API

All shared state flows through a **server-side Event API** (Next.js Route Handlers or equivalent). This is the primary integration and test seam.

Responsibilities of this boundary:

- Ingest Luma URLs and persist normalized events
- Serve the shared chronological feed
- Record accepts and return attendee lists ("who's going")
- Orchestrate Google Calendar event creation on accept
- Enforce deduplication by Luma URL

The UI calls this API; it does not read or write shared events via `localStorage`.

### 2. Domain model replacement

Retire the prototype model (`draft` / `scheduled` / `distributed`, distribution channels, recipients). Adopt three server-persisted entities:

| Entity | Purpose |
|--------|---------|
| **Event** | Shared feed item sourced from a unique Luma URL |
| **Accept** | A user's decision to attend; drives social proof and calendar sync |
| **User** | Identity (Google sign-in) and encrypted calendar OAuth tokens |

**Pass** is not a persisted entity. Passed events are hidden in client session state only.

Per-card interaction state (UI only):

```
pending ──Accept──► accepting ──success──► accepted
   │                      │
   │                      └──fail──► pending + error toast
   └──Pass──► passed (client-local hide only)
```

### 3. Luma ingestion via public metadata (MVP)

For MVP, ingest events by **pasting a Luma URL**. The server fetches the public event page and extracts metadata from **Open Graph tags** and **JSON-LD** where available (title, description, cover image, date/time, location, host).

- Validate URLs against Luma patterns (`lu.ma/*`, `luma.com/event/*`).
- Deduplicate on `lumaUrl`.
- **Do not require a Luma API key** for MVP.

Official Luma API (`https://public-api.luma.com`) requires Luma Plus and calendar-scoped keys — reserved for v2 auto-ingest via webhooks when a member RSVPs on Luma.

### 4. Authentication and calendar sync

- **Google OAuth** for identity and calendar access.
- **Incremental authorization**: visitors browse the feed without signing in; Calendar write scope is requested **only on first Accept**, via a just-in-time connect modal explaining value.
- On accept: create a Google Calendar event in **the accepting user's calendar only**; store `googleCalendarEventId` on the Accept record for future updates.
- Reject/pass triggers no calendar write and no server persistence.

### 5. Persistence

Shared events and accepts require a **server database** (Postgres or SQLite via an ORM). Browser storage is insufficient because all users must see the same feed and attendee lists.

Client session storage may hold passed/hidden event IDs for the current browser session only.

### 6. UI architecture

Replace prototype flows (manual event form, distribution modal) with:

- **Feed-first** shared dashboard with Accept/Pass on each card
- **URL paste** as the primary ingestion path
- **Social proof** via avatar stack + count (accepts only; hide until ≥2 accepts)
- **Calendar views** secondary: mini calendar sidebar (desktop), Feed / Calendar / My Events tabs (mobile)
- **Event detail sheet** for full metadata and attendee list
- Design direction: clean, trustworthy (Luma/Eventbrite aesthetic); inline Accept/Pass buttons on web (not swipe-first)

### 7. Deployment

Target deployment to a public URL (e.g. Vercel) so the community accesses the app without local setup.

## Alternatives Considered

### Keep localStorage prototype and add sync later

- **Pros:** Minimal backend work; fast initial demo.
- **Cons:** No shared feed — each browser sees different data; "who's going" cannot work across users.
- **Rejected:** Contradicts core product value.

### Multi-group / invite-based architecture from day one

- **Pros:** Matches long-term vision of friend groups and invite links.
- **Cons:** Adds auth, tenancy, and UI complexity before validating the feed + accept loop.
- **Rejected for MVP:** Explicitly deferred; start with one global feed.

### Luma API for all ingestion from day one

- **Pros:** Structured data, reliable fields, webhook path for auto-ingest.
- **Cons:** Requires Luma Plus subscription and per-calendar API keys; slower to ship.
- **Rejected for MVP:** URL paste + OG scrape is sufficient; API/webhooks are v2.

### Track both accepts and passes server-side

- **Pros:** Analytics on declined events; possible "who passed" insights.
- **Cons:** Privacy concerns in a social feed; user explicitly chose not to expose rejections.
- **Rejected:** Pass is client-local hide only for MVP.

### Partiful + Luma multi-platform ingest

- **Pros:** Broader event source coverage.
- **Cons:** Different URL/metadata patterns; scope creep.
- **Rejected:** Luma only for MVP.

### Apple Calendar / Outlook sync alongside Google

- **Pros:** Better coverage for non-Google users.
- **Cons:** Multiple OAuth integrations and sync paths; user chose Google only for MVP.
- **Deferred.**

### Swipe-first accept/pass interaction (mobile pattern)

- **Pros:** Fast triage for high-volume feeds.
- **Cons:** Poor discoverability and accessibility on web; research recommends inline buttons as primary.
- **Rejected for web MVP:** Inline Accept/Pass with optional swipe enhancement later.

### Replace repo with greenfield project

- **Pros:** Clean slate without prototype cruft.
- **Cons:** Loses existing Next.js scaffold, GitHub repo, and calendar UI components worth adapting.
- **Rejected:** Evolve in place.

## Consequences

### Positive

- Clear separation between shared state (server API + DB) and personal dismissals (client session).
- MVP shippable without Luma partnership or API keys.
- Single test seam (Event API) keeps integration tests focused and maintainable.
- Accept-only social proof aligns with privacy expectations and simpler schema.
- JIT Google Calendar OAuth improves conversion vs. gating the feed behind sign-in.

### Negative / trade-offs

- Open Graph scraping is **fragile** — Luma page structure changes may break ingestion; JSON-LD fallback and monitoring required.
- Global single feed does not scale socially (noise from unrelated events) — groups will be needed in a future ADR.
- Pass decisions are **lost on new device/browser** — acceptable for MVP since passes are intentionally not tracked.
- Official Luma RSVP still happens on Luma — this app is a coordination layer, not a registration replacement.
- Prototype code (distribution channels, localStorage hook, manual event form) becomes dead weight and should be removed during implementation.

### Follow-up decisions (out of scope for this ADR)

- Choice of database and ORM (Postgres vs SQLite; Prisma vs Drizzle).
- Session/auth library (NextAuth, Auth.js, or custom Google OAuth).
- v2: Luma webhooks, groups/invites, additional calendar providers.

## References

- PRD: `docs/prd/shared-event-feed-mvp.md`
- GitHub issue: https://github.com/tony-ng-vn/event-distributor/issues/1
- Luma API docs: https://docs.luma.com/reference/getting-started-with-your-api
- UX research: inline Accept/Pass, JIT calendar OAuth, feed-first layout, avatar-stack social proof
