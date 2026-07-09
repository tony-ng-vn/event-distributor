# Admin: Program Users tab

Date: 2026-07-08

## Problem

Admins can currently see all events (Admin tab) and pending sign-ups
(`/admin/waitlist`), but there is no view of the full user roster: everyone
who has ever signed in, their admin/approval status, and how active they are
(events created, RSVPs).

## Scope

"Users part of the program" means **everyone in the `users` table**, not just
approved members. The tab shows status badges (Admin, Pending approval) so an
admin can see the whole roster in one place. This is a strict superset of
"approved members only" and "everyone," so it doesn't require picking one
reading over the other.

Approving pending users stays on the existing `/admin/waitlist` page — this
feature does not duplicate that action. This feature adds one new admin
action: promoting/demoting a user's admin flag.

## Placement

A segmented control (`Events` / `Users`) inside the existing "Admin" tab in
`FeedApp.tsx`, reusing the `filter-pill` / `filter-pill-active` styling
already used for the feed's All/Pending/Accepted filter. This is not a new
top-level tab and not a new standalone page — the waitlist page is a separate,
more recently added surface for a narrower purpose (reviewing pending
sign-ups); this feature is scoped to the existing Admin tab.

## Data layer

New function in `src/lib/access-service.ts`, beside `listWaitlistUsers`:

```ts
export type ProgramUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  approved: boolean;
  createdAt: string;
  eventsCreatedCount: number;
  rsvpCount: number;
};

export async function listProgramUsers(): Promise<ProgramUser[]> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .select(
      "id, email, name, image, is_admin, approved, created_at, " +
        "created_events:events!added_by_user_id(id), accepts(id)",
    );

  if (error) throw new Error(error.message);

  const users = (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    isAdmin: row.is_admin === true,
    approved: row.approved === true,
    createdAt: row.created_at as string,
    eventsCreatedCount: ((row.created_events as unknown[]) ?? []).length,
    rsvpCount: ((row.accepts as unknown[]) ?? []).length,
  }));

  return users.sort((a, b) =>
    (a.name?.trim() || a.email).localeCompare(b.name?.trim() || b.email, undefined, {
      sensitivity: "base",
    }),
  );
}

export async function setUserAdmin(
  adminUserId: string,
  targetUserId: string,
  isAdmin: boolean,
): Promise<void> {
  const admin = await isUserAdmin(adminUserId);
  if (!admin) {
    throw new Error("Admin privileges required to change admin status");
  }
  if (targetUserId === adminUserId) {
    throw new Error("Cannot change your own admin status");
  }

  const db = getInsforgeAdmin();
  const { error } = await db.database
    .from("users")
    .update({ is_admin: isAdmin })
    .eq("id", targetUserId);

  if (error) throw new Error(error.message);
}
```

One query, single round trip: the InsForge/PostgREST-style embedded select
(`events!added_by_user_id(id)`, `accepts(id)`) mirrors the existing pattern in
`src/lib/events-service.ts`'s `eventSelect`. Sorting by display name happens
in JS (case-insensitive, falls back to email) rather than in SQL, matching
how other lists in this codebase sort after fetch.

## API routes

`src/app/api/admin/users/route.ts`:
- `GET` — `requireViewer(request)`, 403 if `!isAdmin`, else
  `{ users: await listProgramUsers() }`. Mirrors
  `src/app/api/admin/waitlist/route.ts` exactly (same guard, same error
  shape).
- `PATCH` — body `{ userId: string, isAdmin: boolean }`. Calls
  `requireApprovedViewerUserId(request)` then `setUserAdmin(...)`.
  `setUserAdmin` enforces the admin check and the no-self-demotion rule
  server-side (not just hidden client-side), matching how `approveUser`
  enforces its own admin check independent of the route guard.

## Sync fix (prerequisite)

`src/lib/auth-user.ts`'s `syncClerkUser` currently writes
`is_admin: isAdmin` (where `isAdmin = isAdminEmail(email)`) unconditionally
on every synced update. A manual promotion via this feature would be silently
reverted the next time the promoted user's session syncs (their email isn't
in `ADMIN_EMAILS`).

Fix: mirror the existing `approved` pattern at `auth-user.ts:60`
(`const approved = existing.approved === true || preapproved;`) for
`is_admin`:

```ts
const isAdminGranted = isAdminEmail(email) || existing.is_admin === true;
```

and use `isAdminGranted` in both the skip-write comparison and the
`update(...)` call. Net effect: `ADMIN_EMAILS` only ever grants admin on
sync, never revokes it — manual promotions persist across logins, and manual
demotion of a non-allowlisted admin sticks. Demoting someone whose email is
in `ADMIN_EMAILS` will not stick (expected: the env list is the owner
override).

## UI

`src/components/FeedApp.tsx`:
- New state: `adminSubTab: "events" | "users"`, `programUsers: ProgramUser[] | null`,
  `programUsersLoading: boolean`.
- Lazy-load on first switch to the Users pill (same lazy-load-on-tab-open
  shape the old `loadAdminEvents` used).
- `adminContent` gets a `filter-pill` segmented control above the existing
  events grid; when `adminSubTab === "users"`, render a new
  `ProgramUsersAdmin` component instead of the events grid.

New `src/components/ProgramUsersAdmin.tsx` (presentational, receives data +
callbacks as props, consistent with `AdminEventCard`'s pattern of pure props
in / callbacks out):
- One row per user: avatar or initials (`getAttendeeInitials`), name, email,
  "Joined {date}", "{N} events, {M} RSVPs", an Admin badge and/or Pending
  badge, and a toggle button.
- Toggle button: `window.confirm("Make {name} an admin?" / "Remove admin
  access from {name}?")`, matching the existing `handleDelete` confirm
  pattern in `FeedApp.tsx`. Disabled (not just hidden) on the viewer's own
  row, with a tooltip-style `title` explaining why.
- On confirm: `PATCH /api/admin/users`, optimistic-free (wait for response,
  then update local state), toast on success/failure (reusing the existing
  `toast` state/pattern in `FeedApp.tsx`).

## Testing

- `access-service.test.ts`: `listProgramUsers` returns correct counts and
  alphabetical order (including a null-name-falls-back-to-email case);
  `setUserAdmin` rejects self-demotion and non-admin callers.
- `auth-user.test.ts` (or wherever the sync tests live): promoted user's
  `is_admin` survives a subsequent sync where their email is not
  allowlisted; a non-allowlisted admin can be demoted and stays demoted;
  an allowlisted admin cannot be demoted (sync re-grants).
- Route tests for `GET`/`PATCH /api/admin/users`: 401 signed out, 403
  non-admin, 400 self-demotion attempt, 200 happy path.
- No e2e changes required — this is additive UI behind the existing admin
  gate, exercised by the unit/route tests above.

## Out of scope

- Removing/deleting a user.
- Bulk actions.
- Editing name/email from this view.
- Any change to the waitlist approve flow itself.
