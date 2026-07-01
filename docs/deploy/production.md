# Production deployment

Share Event Radar with friends on a public URL. The app uses **InsForge Postgres** for data and **Clerk** for auth.

## Checklist

| Step | Why |
|------|-----|
| [ ] Clerk production app | Sign up / sign in for Accept + guest list |
| [ ] InsForge project linked | Hosted Postgres + API (`npx @insforge/cli link`) |
| [ ] Vercel deploy | HTTPS URL your friend can open |
| [ ] `LUMA_FETCH_MODE=live` | Real Luma metadata in prod |
| [ ] Custom domain (optional) | Easier to share than `*.vercel.app` |

## 1. Clerk

1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Enable **Email** (and Google/Apple if you want) under **User & authentication**.
3. Copy **Publishable key** and **Secret key**.
4. Under **Paths**, set sign-in `/sign-in`, sign-up `/sign-up`, after sign-in/up `/`.
5. Add your production domain under **Domains**.

Optional (for direct browser → InsForge SDK access later): create a Clerk JWT template named `insforge` signed with InsForge's `JWT_SECRET` — see the `insforge-integrations` skill.

## 2. InsForge database

Schema lives in `migrations/` and is applied with:

```bash
npm run db:migrate
# or: npx @insforge/cli db migrations up --all
```

Tables: `users`, `events`, `accepts` (see `migrations/20260701174826_create-event-radar-schema.sql`).

Get keys from the linked project:

```bash
npx @insforge/cli current --json
npx @insforge/cli secrets get ANON_KEY
```

## 3. Vercel

1. Push repo to GitHub.
2. Import project in [vercel.com](https://vercel.com).
3. Set environment variables:

| Variable | Value |
|----------|--------|
| `INSFORGE_URL` | From `.insforge/project.json` → `oss_host` |
| `INSFORGE_API_KEY` | From linked project (server-only) |
| `NEXT_PUBLIC_INSFORGE_URL` | Same as `INSFORGE_URL` |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY` | `npx @insforge/cli secrets get ANON_KEY` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk |
| `CLERK_SECRET_KEY` | From Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/` |
| `LUMA_FETCH_MODE` | `live` |

4. Build command: `npm run build`
5. Deploy. Run `npm run db:migrate` against production if new migrations were added.

Before pushing, run **`npm run check:deploy`** locally — it runs lint, typecheck, unit tests, and a production build (same gates as GitHub Actions / Vercel). Failures are cached in `.check-in/latest.json`.

## 4. Share with your friend

Send them the Vercel URL. They must **sign in** to see the feed. Then they can:

1. **Sign up / sign in** (Clerk).
2. **Paste Luma links** to add events to the shared feed.
3. **Accept** to show they're interested (RSVP on Luma separately when ready).

## Troubleshooting

- **Feed empty after deploy** — run migrations; check InsForge dashboard logs.
- **401 on Accept** — Clerk keys must match the production domain.
- **Ingest fails** — set `LUMA_FETCH_MODE=live` and ensure Luma URLs are public.

Dashboard: [insforge.dev](https://insforge.dev/dashboard/project/c2f15245-7d7a-4495-a7e9-87d779038c5d)
