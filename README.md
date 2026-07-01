# Event Radar

Shared Luma event feed — paste Luma links, see who's going, and mark events you're joining.

## Features

- **Shared feed** — one global dashboard of upcoming Luma events
- **Luma URL ingest** — paste `lu.ma` links; metadata fetched via Open Graph
- **Accept / Pass** — accept shows you on the guest list; pass hides locally only
- **Who's going** — avatar stack + count from accept records
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
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Integration tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
```

## Docs

- [Production deploy](docs/deploy/production.md)
- [PRD](docs/prd/shared-event-feed-mvp.md)
- [ADR-0001](docs/adr/0001-shared-luma-event-feed-architecture.md)
- [GitHub Issue #1](https://github.com/tony-ng-vn/event-distributor/issues/1)

## Architecture

- **Next.js App Router** + **InsForge Postgres** + **Clerk**
- **Event API** (`/api/events`, `/api/events/ingest`, `/api/events/[id]/accept`) as the shared-state boundary
- Client-only pass tracking via `sessionStorage`
