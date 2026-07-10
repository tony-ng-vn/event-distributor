# Personal Starred Events -- Design

Date: 2026-07-10
Branch: feat/star-events
Status: approved-for-implementation (see "Requirement interpretation" below)

## Summary

Give every approved user a personal "star" on events. Starring an event lifts it
into a dedicated **Starred** section pinned at the top of that user's own feed.
Stars are private: one user's stars never change what anyone else sees.

The gesture: hover any event card, a star toggle appears in the top corner, click
it to star/unstar. Starred events are lifted out of their normal New/Past spot into
the top Starred section (no duplicate card).

## Requirement interpretation (flagged assumption)

The original spoken request mixed two ideas: "a star event that you want to star...
for you to see" (personal) and "a separate UI section on the top so everyone can see
it" (global). This PR builds the **personal, per-user** interpretation only.

A separate admin capability to "feature" an event globally (pin it for everyone) is
**deferred to a follow-up PR**. If the intended feature was the global one, this PR is
still a clean, independent building block and can be adjusted.

This choice is called out here and in the PR body so a human can course-correct.

## Non-goals

- No global / admin "feature for everyone" pin (separate follow-up PR).
- No exposure of who else starred an event. Stars are private; we surface only the
  viewer's own `viewerStarred` boolean, not a count or a list of starrers.
- No change to accept/pass semantics. Star is orthogonal: you can star an event you
  have accepted or passed, and starring does not touch accept/pass rows.
- No star toggle inside the event detail sheet in this PR (card only). Possible
  follow-up for consistency.

## Data model

New `stars` table, mirroring the existing `passes` table exactly:

```sql
create table public.stars (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  starred_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index stars_user_id_idx on public.stars (user_id);
alter table public.stars enable row level security;
create policy "users star for themselves"
  on public.stars for insert to authenticated
  with check (
    user_id = (select u.id from public.users u
               where u.clerk_id = public.requesting_user_id())
  );
grant insert on public.stars to authenticated;
```

Migration file: `migrations/<timestamp>_create-stars-table.sql`.

**DB safety:** this migration is applied to the **dev** project (`qw74uz59`) only.
`.insforge/project.json` targets prod (`yy57ijjh`), so `npm run db:migrate` must not
be run blind. Apply to dev explicitly; prod is a human-approved step later.

## Serialization (events-service.ts)

- Extend `eventSelect` embed with `stars(id, user_id)`. Only `user_id` is needed to
  compute the viewer's own boolean; no nested user object (keeps payload small and
  stars private).
- Add `InsforgeStarRow` type and `stars` to `InsforgeEventRow`.
- `serializeEvent` gains `viewerStarred: boolean` -> true when any star row's
  `user_id === viewerUserId`, else false.

## Service functions (events-service.ts)

- `starEvent(eventId, userId)` -- mirror `acceptEvent`: `assertEventAndUserExist`,
  insert a star row if none exists (idempotent), return `reloadSerializedEvent`.
  Does NOT touch accepts/passes.
- `unstarEvent(eventId, userId)` -- mirror `unacceptEvent`: delete the star row
  (no-op if absent), return `reloadSerializedEvent`.
- Add `stars` cleanup to `resetDatabase` (delete before `events`, like `passes`).

## API route

`src/app/api/events/[id]/star/route.ts`, mirroring the pass route:

- `POST` -> `requireApprovedViewerUserId` then `starEvent`. 401/403 via `gateResponse`.
- `DELETE` -> `requireApprovedViewerUserId` then `unstarEvent`.

## Feed partition (feed-partition.ts)

- Add `starState: Record<string, boolean | undefined>` to `FeedPartitionInput`
  (default `{}`), and an `isStarredEvent(event, starState)` helper:
  `starState[id] ?? event.viewerStarred`.
- `partitionFeedEvents` returns a new `starredEvents` bucket in addition to
  `newEvents` / `pastEvents`. A starred event goes ONLY into `starredEvents` and is
  excluded from new/past (lifted out, no duplicate). Star wins even over "passed"
  (an explicit pin should stay pinned).
- Starred events honor the date filter (calendar day). They are NOT filtered by the
  pending/accepted pills -- a personal pin stays visible at the top regardless of the
  main-list pill. Documented so the behavior is predictable.

## Feed UI (FeedApp.tsx)

- Local optimistic `starState: Record<string, boolean>`; effective starred =
  `starState[id] ?? event.viewerStarred`.
- `handleToggleStar(eventId, currentlyStarred)`: optimistic flip, POST or DELETE
  `/api/events/{id}/star`, then `syncEventsFromServer`; revert + toast on error;
  401 opens the sign-in modal (mirrors pass).
- Render a **Starred** `<section>` above "New events" when `starredEvents.length > 0`,
  using the same `renderFeedCards`. `visibleEventCount` includes starred.

## Star button (EventFeedCard.tsx)

- New props `starred: boolean` and `onStar: () => void`.
- A star toggle button positioned top-right. When the admin Delete button is present,
  the two sit side by side in a top-right flex row (`[star][delete]`).
- Accessibility + reveal: on small screens the button is always visible (no hover on
  touch). On `sm+` it is hidden (`opacity-0`) and revealed on card hover
  (`group-hover`) and on keyboard focus (`focus-visible`). When starred, it is always
  visible and filled. `aria-pressed={starred}`, label "Star {title}" / "Unstar {title}".
  The `article` gets the `group` class to drive `group-hover`.
- New `.btn-star` component class in `globals.css`: small circular control with a
  glassy background (legible over the thumbnail), amber fill when starred, muted
  outline when not. Respects the existing reduced-motion / hover rules.

## Tests (TDD -- write first, watch fail, implement)

- Integration (`tests/integration/events-service.test.ts`): starEvent creates a row
  and sets `viewerStarred`; unstarEvent clears it; star is idempotent; `viewerStarred`
  is per-viewer (user A's star not visible to user B); starring does not change
  accept/pass.
- Unit (`tests/unit/feed-partition.test.ts`): starred events land in `starredEvents`
  and are excluded from new/past; local `starState` override precedence; star wins over
  passed.
- Unit (`tests/unit/event-feed-card.test.ts`): star button renders, exposes correct
  aria-label/aria-pressed, and calls `onStar` on click.

## Delivery

- Conventional-commit history, TDD per change.
- CHANGELOG: new `## v0.6.0` entry (minor), categories **Feed**, **Events API**,
  **Infrastructure**. Bump `package.json` to `0.6.0`.
- Run the `understanding` skill bundle once after the review loop passes (per AGENTS.md).
- Open PR, monitor CI to green + address review, but leave the merge button for a human
  given the requirement interpretation above.
