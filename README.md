# Event Radar

Shared Luma event feed for your friend group — paste links, see who's interested, mark events you're in.

## Features

- **Friends-only feed** — sign in to see and share events with your group
- **Luma URL ingest** — paste `lu.ma` links; metadata fetched via Open Graph
- **Accept / Pass** — accept shows interest in-app (not Luma RSVP); pass moves events to your past list
- **Who's interested** — avatar stack + count from in-app accept records
- **Clerk auth** — sign up / sign in for guest list identity (RSVP on Luma separately)
- **Responsive UI** — social feed layout, mobile tabs (Feed / Calendar / My Events)

## Quick start

```bash
npm install
npx @insforge/cli link --project-id <your-project-id>   # once per machine
cp .env.example .env.local   # add Clerk + InsForge keys
npm run db:migrate
npm run dev
```

Open http://localhost:3000

## Environment

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `INSFORGE_URL` / `INSFORGE_API_KEY` | InsForge backend (server-only admin key) |
| `NEXT_PUBLIC_INSFORGE_URL` / `NEXT_PUBLIC_INSFORGE_ANON_KEY` | InsForge public client config |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_*_URL` | Sign-in/up paths (defaults in `.env.example`) |
| `LUMA_FETCH_MODE` | `mock` for local dev; `live` in production |

E2E variables (`E2E_TEST`, `E2E_TEST_SECRET`) are injected by Playwright — not needed for daily dev.

## Production

See **[docs/deploy/production.md](docs/deploy/production.md)** — Clerk + InsForge + Vercel checklist for sharing with friends.

## Scripts

```bash
npm run dev            # Start dev server
npm run check          # Fast local check-in (lint + typecheck + unit tests)
npm run check:deploy   # Pre-push gate — adds production build (matches Vercel)
npm run check:full     # Deploy gate + InsForge integration tests
npm run build          # Production build
npm test               # All Vitest tests
npm run test:unit      # Unit tests only
npm run test:integration  # InsForge integration tests
npm run test:e2e       # E2E tests (Playwright)
```

Failed check-ins cache output under `.check-in/latest.json` and `.check-in/latest.log` so you can inspect errors without re-running everything.

**Before pushing:** run `npm run check:deploy` to catch TypeScript and build failures locally (the same class of error that broke the Vercel deploy).

## Docs

- [Production deploy](docs/deploy/production.md)
- [PRD](docs/prd/shared-event-feed-mvp.md)
- [ADR-0001](docs/adr/0001-shared-luma-event-feed-architecture.md)
- [GitHub Issue #1](https://github.com/tony-ng-vn/event-distributor/issues/1)

## Architecture

- **Next.js App Router** + **InsForge Postgres** + **Clerk**
- **Event API** (`/api/events`, `/api/events/ingest`, `/api/events/[id]/accept`) as the shared-state boundary
- Client-only pass tracking via `sessionStorage`
