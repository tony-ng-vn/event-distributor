## Agent skills

### Understanding layer (human-in-the-loop)

Run the **`understanding` skill bundle** **once per PR** after the goal-method review loop passes — not during every commit. See `docs/agents/understanding-layer.md` and `.cursor/rules/feature-goal-workflow.mdc`.

| What | Where |
|------|-------|
| **Feature workflow (goal method)** | `.cursor/rules/feature-goal-workflow.mdc` |
| **Skill bundle (start here)** | `.cursor/skills/understanding/SKILL.md` |
| Reading order (humans) | `docs/understanding/branches/<branch>/reading-order.md` |
| Commit tiers | `.cursor/skills/understanding/commit-policy.md` |
| Checkpoints | `.cursor/skills/understanding/checkpoints.md` |

```bash
npm run understanding:index -- --branch "$(git branch --show-current)" --base main
npm run understanding:diff -- --commit <sha>
```

### Issue tracker

Issues and PRDs live in GitHub Issues for `tony-ng-vn/event-distributor`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles map to GitHub labels (`ready-for-agent`, etc.). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo. See `docs/agents/domain.md`.

### Changelog

CHANGELOG.md entries use `## vX.Y.Z` headings (date below, `---` between entries) with these categories: **Feed** (client UI), **Events API** (routes + events-service), **Notifications** (email pipeline), **Auth** (Clerk/InsForge bridge), **Infrastructure** (deps, scripts, config, CI), **Docs**. Keep `package.json` version in sync with the newest entry.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **Event for Friends** (API base `https://yy57ijjh.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
- **Database safety:** agents and tests must never run destructive helpers against production (`yy57ijjh`). Develop and test against the dev project, and require `INSFORGE_ALLOW_DESTRUCTIVE_WRITES=true` (integration tests) plus a non-production `INSFORGE_URL` before any reset helper runs (enforced in `src/lib/db-safety.ts`).
<!-- INSFORGE:END -->
