# Admin Program Users Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins a "Users" view inside the existing Admin tab showing every user in the program (name, email, join date, admin/pending badges, events-created and RSVP counts) with a promote/demote-admin action.

**Architecture:** A segmented control (`Events` / `Users`, reusing the existing `filter-pill` styling) inside `FeedApp.tsx`'s Admin tab switches between the current events grid and a new `ProgramUsersAdmin` presentational component. Data comes from a new `listProgramUsers()` in `src/lib/access-service.ts` (three parallel plain-column queries against `users`/`events`/`accepts`, aggregated in JS — no embedded-relation query syntax, since only the events-to-users embed direction is proven elsewhere in this codebase) exposed via a new `GET /api/admin/users` route. Promotion/demotion goes through `PATCH /api/admin/users` -> `setUserAdmin()`, which enforces admin-only and no-self-demotion server-side. A prerequisite fix changes `syncClerkUser` (`src/lib/auth-user.ts`) so the `ADMIN_EMAILS` allowlist only ever *grants* `is_admin` on sync, never *revokes* it — otherwise a manual promotion would be silently undone the next time the promoted user's session syncs.

**Tech Stack:** Next.js App Router route handlers, React client components, InsForge Postgres via `getInsforgeAdmin()`, Vitest (`tests/unit`, `tests/integration`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-08-admin-program-users-tab-design.md` — read it before starting; every task below implements one piece of it.
- "Users part of the program" = everyone in the `users` table (approved and pending), shown with status badges. Do not filter to approved-only.
- Approving pending users stays on `/admin/waitlist` — do not add an approve action to this feature.
- No deleting users, no bulk actions, no editing name/email from this view.
- Self-demotion is blocked both server-side (`setUserAdmin` throws) and client-side (toggle button disabled on the viewer's own row).
- Follow existing conventions exactly: `filter-pill`/`filter-pill-active`/`filter-pill-inactive` CSS classes for the segmented control, `window.confirm` for the promote/demote confirmation (matching `handleDelete` in `FeedApp.tsx`), the `toast` state pattern for success/failure messages, `getAttendeeInitials` for avatar fallbacks, `glass-card` for row styling.
- `npm test` (unit + integration) must pass before each commit that touches tested code. `npm run typecheck` and `npm run lint` must be clean before the final commit.
- Integration tests require a linked InsForge dev project (`.insforge/project.json`) and must never run against production — this is enforced by `tests/setup.integration.ts` / `src/lib/db-safety.ts` already; do not weaken it.

---

### Task 1: Stop the admin-flag sync from reverting manual promotions

**Files:**
- Modify: `src/lib/admin.ts`
- Modify: `src/lib/auth-user.ts:1-82`
- Test: `tests/unit/admin.test.ts` (new)

**Interfaces:**
- Produces: `resolveAdminFlag(email: string, existingIsAdmin: boolean): boolean` exported from `src/lib/admin.ts`, used by Task 2 onward wherever admin status needs to reflect a manual promotion done through this feature.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin.test.ts`:

```ts
/**
 * Unit tests for the admin-flag merge rule: the ADMIN_EMAILS allowlist only
 * ever grants admin on sync, never revokes a manually-set flag.
 */
import { describe, expect, it, afterEach } from "vitest";
import { resolveAdminFlag } from "@/lib/admin";

describe("resolveAdminFlag", () => {
  const original = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it("grants admin when the email is on the allowlist, regardless of the existing flag", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(resolveAdminFlag("boss@example.com", false)).toBe(true);
    expect(resolveAdminFlag("boss@example.com", true)).toBe(true);
  });

  it("keeps a manually-granted admin flag even when the email is not on the allowlist", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(resolveAdminFlag("friend@example.com", true)).toBe(true);
  });

  it("stays false when neither the allowlist nor the existing flag grant admin", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(resolveAdminFlag("stranger@example.com", false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/admin.test.ts`
Expected: FAIL — `resolveAdminFlag is not exported from "@/lib/admin"` (or similar module error).

- [ ] **Step 3: Add `resolveAdminFlag` to `src/lib/admin.ts`**

Current file:

```ts
import { getInsforgeAdmin } from "@/lib/db";

/** Emails granted admin on Clerk sync (comma-separated in ADMIN_EMAILS). */
const DEFAULT_ADMIN_EMAILS = ["tonythiennguyen17@gmail.com"];

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw?.trim()) return DEFAULT_ADMIN_EMAILS;
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/** Returns true when the user has platform admin privileges. */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.is_admin === true;
}
```

Add `resolveAdminFlag` right after `isAdminEmail`:

```ts
export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/**
 * Merges the env allowlist with the persisted flag for Clerk sync writes.
 * The allowlist only ever grants admin -- it never revokes a flag that was
 * set some other way (e.g. a manual promotion from the admin Users tab).
 */
export function resolveAdminFlag(
  email: string,
  existingIsAdmin: boolean,
): boolean {
  return isAdminEmail(email) || existingIsAdmin;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/admin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire `resolveAdminFlag` into `syncClerkUser`**

In `src/lib/auth-user.ts`, current relevant excerpt:

```ts
import { isAdminEmail, isUserAdmin } from "@/lib/admin";
import { isEmailPreapproved, isUserApproved } from "@/lib/access-service";
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";

/** Thrown when a signed-in but unapproved user hits a gated endpoint. */
export const WAITLIST_PENDING_MESSAGE =
  "Your account is waiting for approval";

function resolveE2EUserId(request: Request): string | null {
  if (process.env.E2E_TEST !== "true") return null;

  const secret = request.headers.get("x-e2e-secret");
  const userId = request.headers.get("x-e2e-user-id");
  if (secret === process.env.E2E_TEST_SECRET && userId) return userId;

  return null;
}

async function syncClerkUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const clerkName = clerkUser.fullName ?? clerkUser.firstName ?? null;
  const image = clerkUser.imageUrl ?? null;
  const isAdmin = isAdminEmail(email);
  // Admins and anyone on the preapproval list skip the waitlist automatically;
  // this also lets the owner grant access to a pending user by adding their
  // email to APPROVED_EMAILS -- they clear the gate on their next sign-in.
  const preapproved = isEmailPreapproved(email);
  const db = getInsforgeAdmin();

  const { data: existing, error: existingError } = await db.database
    .from("users")
    .select("id, clerk_id, email, name, image, is_admin, approved")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const name = clerkName ?? existing.name;
    // Approval only ever moves false -> true (preapproval); admin approvals
    // write the column directly, so never downgrade here.
    const approved = existing.approved === true || preapproved;

    // Skip the write when nothing changed -- this runs on every authed request.
    if (
      existing.email === email &&
      existing.name === name &&
      existing.image === image &&
      existing.is_admin === isAdmin &&
      existing.approved === approved
    ) {
      return existing;
    }

    const { data: updated, error: updateError } = await db.database
      .from("users")
      .update({ email, name, image, is_admin: isAdmin, approved })
      .eq("id", existing.id)
      .select("id, clerk_id, email, name, image, is_admin, approved")
      .single();

    if (updateError) throw new Error(updateError.message);
    return updated;
  }

  const { data: created, error: createError } = await db.database
    .from("users")
    .insert([
      {
        id: newId(),
        clerk_id: clerkId,
        email,
        name: clerkName,
        image,
        is_admin: isAdmin,
        approved: preapproved,
      },
    ])
    .select("id, clerk_id, email, name, image, is_admin, approved")
    .single();

  if (createError) throw new Error(createError.message);
  return created;
}
```

Change the import and remove the early `isAdmin` computation (it depends on
`existing`, which is not fetched yet at that point); compute it once we know
whether a row already exists, in each branch:

```ts
import { isAdminEmail, isUserAdmin, resolveAdminFlag } from "@/lib/admin";
```

Replace:

```ts
  const clerkName = clerkUser.fullName ?? clerkUser.firstName ?? null;
  const image = clerkUser.imageUrl ?? null;
  const isAdmin = isAdminEmail(email);
  // Admins and anyone on the preapproval list skip the waitlist automatically;
```

with:

```ts
  const clerkName = clerkUser.fullName ?? clerkUser.firstName ?? null;
  const image = clerkUser.imageUrl ?? null;
  // Admins and anyone on the preapproval list skip the waitlist automatically;
```

Replace the `if (existing) { ... }` block's opening so `isAdmin` is derived
from the fetched row via `resolveAdminFlag`:

```ts
  if (existing) {
    const name = clerkName ?? existing.name;
    // ADMIN_EMAILS only ever grants admin here; a manual promotion (or
    // demotion of a non-allowlisted admin) made via the admin Users tab
    // persists across future syncs instead of being silently reverted.
    const isAdmin = resolveAdminFlag(email, existing.is_admin === true);
    // Approval only ever moves false -> true (preapproval); admin approvals
    // write the column directly, so never downgrade here.
    const approved = existing.approved === true || preapproved;
```

(the rest of the `if (existing) { ... }` block is unchanged — it already
reads the local `isAdmin`).

Replace the create branch's `is_admin: isAdmin` with a direct
`isAdminEmail(email)` call, since there is no existing row to merge with:

```ts
  const { data: created, error: createError } = await db.database
    .from("users")
    .insert([
      {
        id: newId(),
        clerk_id: clerkId,
        email,
        name: clerkName,
        image,
        is_admin: isAdminEmail(email),
        approved: preapproved,
      },
    ])
```

- [ ] **Step 6: Run typecheck and the full unit suite**

Run: `npm run typecheck && npm run test:unit`
Expected: both PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin.ts src/lib/auth-user.ts tests/unit/admin.test.ts
git commit -m "fix(auth): stop admin allowlist sync from reverting manual promotions"
```

---

### Task 2: Data layer — `listProgramUsers` and `setUserAdmin`

**Files:**
- Modify: `src/lib/access-service.ts`
- Test: `tests/integration/access-service.test.ts`

**Interfaces:**
- Consumes: `isUserAdmin` (already imported in `access-service.ts` from `@/lib/admin`), `getInsforgeAdmin` (already imported from `@/lib/db`).
- Produces: `export type ProgramUser = { id: string; email: string; name: string | null; image: string | null; isAdmin: boolean; approved: boolean; createdAt: string; eventsCreatedCount: number; rsvpCount: number }`, `export async function listProgramUsers(): Promise<ProgramUser[]>`, `export async function setUserAdmin(adminUserId: string, targetUserId: string, isAdmin: boolean): Promise<void>` — all from `src/lib/access-service.ts`. Task 3's route imports these two functions and the type.

- [ ] **Step 1: Write the failing integration tests**

Append to `tests/integration/access-service.test.ts` (after the existing
`describe("access service (waitlist gate)", ...)` block, same file, new
`describe`):

```ts
import { acceptEvent, createUser, ingestLumaEvent, resetDatabase } from "@/lib/events-service";
import {
  approveUser,
  isUserApproved,
  listProgramUsers,
  listWaitlistUsers,
  setUserAdmin,
} from "@/lib/access-service";
```

(merge into the existing top-of-file imports rather than duplicating the
`describe`/`resetDatabase` imports — add `acceptEvent`, `ingestLumaEvent` to
the existing `@/lib/events-service` import, and `listProgramUsers`,
`setUserAdmin` to the existing `@/lib/access-service` import.)

```ts
describe("program users roster", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists every user sorted by display name, falling back to email when name is null", async () => {
    await createUser({ email: "zack@example.com", name: "Zack" });
    await createUser({ email: "amy@example.com", name: "Amy" });
    await createUser({ email: "noname@example.com" });

    const users = await listProgramUsers();
    expect(users.map((u) => u.email)).toEqual([
      "amy@example.com",
      "noname@example.com",
      "zack@example.com",
    ]);
  });

  it("counts events created and RSVPs per user", async () => {
    const host = await createUser({ email: "host@example.com", name: "Host", approved: true });
    const guest = await createUser({ email: "guest@example.com", name: "Guest", approved: true });

    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup", host.id);
    await acceptEvent(event.id, guest.id);
    await acceptEvent(event.id, host.id);

    const users = await listProgramUsers();
    const hostRow = users.find((u) => u.id === host.id);
    const guestRow = users.find((u) => u.id === guest.id);

    expect(hostRow?.eventsCreatedCount).toBe(1);
    expect(hostRow?.rsvpCount).toBe(1);
    expect(guestRow?.eventsCreatedCount).toBe(0);
    expect(guestRow?.rsvpCount).toBe(1);
  });

  it("includes admin and approval status on each row", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const pending = await createUser({ email: "pending@example.com", name: "Pending" });

    const users = await listProgramUsers();
    expect(users.find((u) => u.id === admin.id)).toMatchObject({
      isAdmin: true,
      approved: true,
    });
    expect(users.find((u) => u.id === pending.id)).toMatchObject({
      isAdmin: false,
      approved: false,
    });
  });
});

describe("setUserAdmin", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lets an admin promote another user and blocks non-admins", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const regular = await createUser({ email: "regular@example.com", name: "Regular", approved: true });
    const target = await createUser({ email: "target@example.com", name: "Target", approved: true });

    await expect(setUserAdmin(regular.id, target.id, true)).rejects.toThrow(/admin/i);

    await setUserAdmin(admin.id, target.id, true);
    const users = await listProgramUsers();
    expect(users.find((u) => u.id === target.id)?.isAdmin).toBe(true);
  });

  it("lets an admin demote another admin", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });
    const otherAdmin = await createUser({
      email: "other@example.com",
      name: "Other",
      isAdmin: true,
      approved: true,
    });

    await setUserAdmin(admin.id, otherAdmin.id, false);
    const users = await listProgramUsers();
    expect(users.find((u) => u.id === otherAdmin.id)?.isAdmin).toBe(false);
  });

  it("rejects an admin trying to change their own admin status", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin",
      isAdmin: true,
      approved: true,
    });

    await expect(setUserAdmin(admin.id, admin.id, false)).rejects.toThrow(/own admin status/i);
    const users = await listProgramUsers();
    expect(users.find((u) => u.id === admin.id)?.isAdmin).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:integration -- tests/integration/access-service.test.ts`
Expected: FAIL — `listProgramUsers`/`setUserAdmin` are not exported from
`@/lib/access-service`.

- [ ] **Step 3: Implement `listProgramUsers` and `setUserAdmin`**

Append to `src/lib/access-service.ts` (after the existing `approveUser`
function, end of file):

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

/**
 * Admin view: every user in the program, with activity counts. Three plain
 * queries run in parallel and are aggregated in JS -- the InsForge/PostgREST
 * embedded-relation select (`events!added_by_user_id(id)`) is only proven in
 * this codebase in the events-to-users direction (see `eventSelect` in
 * events-service.ts), not the reverse.
 */
export async function listProgramUsers(): Promise<ProgramUser[]> {
  const db = getInsforgeAdmin();

  const [usersResult, eventsResult, acceptsResult] = await Promise.all([
    db.database
      .from("users")
      .select("id, email, name, image, is_admin, approved, created_at"),
    db.database.from("events").select("added_by_user_id"),
    db.database.from("accepts").select("user_id"),
  ]);

  if (usersResult.error) throw new Error(usersResult.error.message);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (acceptsResult.error) throw new Error(acceptsResult.error.message);

  const eventCounts = new Map<string, number>();
  for (const row of eventsResult.data ?? []) {
    const userId = row.added_by_user_id as string | null;
    if (!userId) continue;
    eventCounts.set(userId, (eventCounts.get(userId) ?? 0) + 1);
  }

  const rsvpCounts = new Map<string, number>();
  for (const row of acceptsResult.data ?? []) {
    const userId = row.user_id as string;
    rsvpCounts.set(userId, (rsvpCounts.get(userId) ?? 0) + 1);
  }

  const users = (usersResult.data ?? []).map((row) => {
    const id = row.id as string;
    return {
      id,
      email: row.email as string,
      name: (row.name as string | null) ?? null,
      image: (row.image as string | null) ?? null,
      isAdmin: row.is_admin === true,
      approved: row.approved === true,
      createdAt: row.created_at as string,
      eventsCreatedCount: eventCounts.get(id) ?? 0,
      rsvpCount: rsvpCounts.get(id) ?? 0,
    };
  });

  return users.sort((a, b) =>
    (a.name?.trim() || a.email).localeCompare(b.name?.trim() || b.email, undefined, {
      sensitivity: "base",
    }),
  );
}

/** Admin action: promote or demote another user's admin flag. */
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:integration -- tests/integration/access-service.test.ts`
Expected: PASS (all tests in the file, old and new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/access-service.ts tests/integration/access-service.test.ts
git commit -m "feat(access): add listProgramUsers and setUserAdmin"
```

---

### Task 3: API route — `GET`/`PATCH /api/admin/users`

**Files:**
- Create: `src/app/api/admin/users/route.ts`
- Test: `tests/unit/admin-users-route.test.ts` (new)

**Interfaces:**
- Consumes: `requireViewer(request?: Request): Promise<{ userId: string; isAdmin: boolean; approved: boolean }>`, `requireApprovedViewerUserId(request?: Request): Promise<string>`, `WAITLIST_PENDING_MESSAGE: string` (all from `@/lib/auth-user`, already exist); `listProgramUsers(): Promise<ProgramUser[]>`, `setUserAdmin(adminUserId: string, targetUserId: string, isAdmin: boolean): Promise<void>` (from Task 2).
- Produces: `GET` returns `{ users: ProgramUser[]; viewerUserId: string }` (200) or `{ error, code? }` (401/403); `PATCH` returns `{ ok: true }` (200) or `{ error, code? }` (400/401/403). Task 5's client fetches this route.

- [ ] **Step 1: Write the failing route tests**

Create `tests/unit/admin-users-route.test.ts`:

```ts
/**
 * Route tests for GET/PATCH /api/admin/users. Auth + service layers mocked.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const requireViewer = vi.fn();
const requireApprovedViewerUserId = vi.fn();
const listProgramUsers = vi.fn();
const setUserAdmin = vi.fn();

vi.mock("@/lib/auth-user", () => ({
  requireViewer: (...args: unknown[]) => requireViewer(...args),
  requireApprovedViewerUserId: (...args: unknown[]) =>
    requireApprovedViewerUserId(...args),
  WAITLIST_PENDING_MESSAGE: "Your account is waiting for approval",
}));
vi.mock("@/lib/access-service", () => ({
  listProgramUsers: (...args: unknown[]) => listProgramUsers(...args),
  setUserAdmin: (...args: unknown[]) => setUserAdmin(...args),
}));

import { GET, PATCH } from "@/app/api/admin/users/route";

function req(method: string, body?: unknown) {
  return new Request("https://app.example.com/api/admin/users", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    requireViewer.mockReset();
    listProgramUsers.mockReset();
  });

  it("returns 403 for a signed-in non-admin", async () => {
    requireViewer.mockResolvedValue({ userId: "u1", isAdmin: false, approved: true });
    const response = await GET(req("GET"));
    expect(response.status).toBe(403);
    expect(listProgramUsers).not.toHaveBeenCalled();
  });

  it("returns 401 when signed out", async () => {
    requireViewer.mockRejectedValue(new Error("Sign in required to view events"));
    const response = await GET(req("GET"));
    expect(response.status).toBe(401);
  });

  it("returns the roster and viewer id for an admin", async () => {
    requireViewer.mockResolvedValue({ userId: "admin-1", isAdmin: true, approved: true });
    listProgramUsers.mockResolvedValue([{ id: "u1", email: "a@example.com" }]);
    const response = await GET(req("GET"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(1);
    expect(data.viewerUserId).toBe("admin-1");
  });
});

describe("PATCH /api/admin/users", () => {
  beforeEach(() => {
    requireApprovedViewerUserId.mockReset();
    setUserAdmin.mockReset();
  });

  it("returns 400 when userId is missing", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    const response = await PATCH(req("PATCH", { isAdmin: true }));
    expect(response.status).toBe(400);
    expect(setUserAdmin).not.toHaveBeenCalled();
  });

  it("returns 400 when isAdmin is not a boolean", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    const response = await PATCH(req("PATCH", { userId: "u2" }));
    expect(response.status).toBe(400);
    expect(setUserAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 when setUserAdmin rejects a self-demotion", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    setUserAdmin.mockRejectedValue(new Error("Cannot change your own admin status"));
    const response = await PATCH(req("PATCH", { userId: "admin-1", isAdmin: false }));
    expect(response.status).toBe(403);
  });

  it("promotes a user on the happy path", async () => {
    requireApprovedViewerUserId.mockResolvedValue("admin-1");
    setUserAdmin.mockResolvedValue(undefined);
    const response = await PATCH(req("PATCH", { userId: "u2", isAdmin: true }));
    expect(response.status).toBe(200);
    expect(setUserAdmin).toHaveBeenCalledWith("admin-1", "u2", true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- tests/unit/admin-users-route.test.ts`
Expected: FAIL — cannot find module `@/app/api/admin/users/route`.

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/users/route.ts`:

```ts
/**
 * GET /api/admin/users — full user roster with admin/approval status and
 * activity counts (admin only).
 * PATCH /api/admin/users — promote or demote a user's admin flag (admin only).
 * Approving pending sign-ups stays on /api/admin/waitlist -- this route does
 * not touch the `approved` column.
 */
import { NextResponse } from "next/server";
import {
  requireApprovedViewerUserId,
  requireViewer,
  WAITLIST_PENDING_MESSAGE,
} from "@/lib/auth-user";
import { listProgramUsers, setUserAdmin } from "@/lib/access-service";

export async function GET(request: Request) {
  try {
    const { userId, isAdmin } = await requireViewer(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 },
      );
    }

    const users = await listProgramUsers();
    return NextResponse.json({ users, viewerUserId: userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = /sign in required/i.test(message) ? 401 : 400;
    return NextResponse.json(
      { error: message, code: "AUTH_REQUIRED" },
      { status },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUserId = await requireApprovedViewerUserId(request);
    const body = (await request.json()) as {
      userId?: string;
      isAdmin?: boolean;
    };

    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (typeof body.isAdmin !== "boolean") {
      return NextResponse.json(
        { error: "isAdmin must be a boolean" },
        { status: 400 },
      );
    }

    await setUserAdmin(adminUserId, body.userId.trim(), body.isAdmin);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    if (message === WAITLIST_PENDING_MESSAGE) {
      return NextResponse.json(
        { error: message, code: "WAITLIST_PENDING" },
        { status: 403 },
      );
    }
    if (/sign in required/i.test(message)) {
      return NextResponse.json(
        { error: message, code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    const status = /admin privileges|own admin status/i.test(message) ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- tests/unit/admin-users-route.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/route.ts tests/unit/admin-users-route.test.ts
git commit -m "feat(auth): add GET/PATCH /api/admin/users"
```

---

### Task 4: `ProgramUsersAdmin` presentational component

**Files:**
- Create: `src/components/ProgramUsersAdmin.tsx`
- Test: `tests/unit/program-users-admin.test.ts` (new)

**Interfaces:**
- Consumes: `getAttendeeInitials(name: string | null): string` from `@/lib/attendees` (existing).
- Produces: `export type ProgramUserView = { id: string; email: string; name: string | null; image: string | null; isAdmin: boolean; approved: boolean; createdAt: string; eventsCreatedCount: number; rsvpCount: number }` and `export function ProgramUsersAdmin(props: { users: ProgramUserView[] | null; loading: boolean; viewerUserId: string | null; pendingToggleId: string | null; onToggleAdmin: (user: ProgramUserView) => void }): JSX.Element` — Task 5 imports both from `@/components/ProgramUsersAdmin`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/program-users-admin.test.ts`:

```ts
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProgramUsersAdmin, type ProgramUserView } from "@/components/ProgramUsersAdmin";

const ADMIN: ProgramUserView = {
  id: "admin-1",
  email: "admin@example.com",
  name: "Ada Admin",
  image: null,
  isAdmin: true,
  approved: true,
  createdAt: "2026-01-05T00:00:00.000Z",
  eventsCreatedCount: 3,
  rsvpCount: 5,
};

const PENDING: ProgramUserView = {
  id: "pending-1",
  email: "pending@example.com",
  name: null,
  image: null,
  isAdmin: false,
  approved: false,
  createdAt: "2026-02-10T00:00:00.000Z",
  eventsCreatedCount: 0,
  rsvpCount: 0,
};

function render(props: Partial<Parameters<typeof ProgramUsersAdmin>[0]>) {
  return renderToStaticMarkup(
    createElement(ProgramUsersAdmin, {
      users: [ADMIN, PENDING],
      loading: false,
      viewerUserId: null,
      pendingToggleId: null,
      onToggleAdmin: () => undefined,
      ...props,
    }),
  );
}

describe("ProgramUsersAdmin", () => {
  it("shows an Admin badge for admins and a Pending badge for unapproved users", () => {
    const html = render({});
    expect(html).toContain("Admin");
    expect(html).toContain("Pending");
  });

  it("falls back to email when name is null", () => {
    const html = render({});
    expect(html).toContain("pending@example.com");
  });

  it("shows event and RSVP counts", () => {
    const html = render({});
    expect(html).toContain("3 events");
    expect(html).toContain("5 RSVPs");
  });

  it("disables the toggle on the viewer's own row", () => {
    const html = render({ viewerUserId: "admin-1" });
    const rowStart = html.indexOf('data-testid="toggle-admin-admin-1"');
    const rowMarkup = html.slice(rowStart - 20, rowStart + 200);
    expect(rowMarkup).toContain("disabled");
  });

  it("does not disable the toggle on other rows", () => {
    const html = render({ viewerUserId: "admin-1" });
    const rowStart = html.indexOf('data-testid="toggle-admin-pending-1"');
    const rowMarkup = html.slice(rowStart - 20, rowStart + 200);
    expect(rowMarkup).not.toContain("disabled");
  });

  it("shows a loading state", () => {
    const html = render({ loading: true, users: null });
    expect(html).toContain("Loading users");
  });

  it("shows an empty state", () => {
    const html = render({ users: [] });
    expect(html).toContain("No users yet");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/unit/program-users-admin.test.ts`
Expected: FAIL — cannot find module `@/components/ProgramUsersAdmin`.

- [ ] **Step 3: Implement the component**

Create `src/components/ProgramUsersAdmin.tsx`:

```tsx
/**
 * Admin roster: everyone in the program, with status badges and an admin
 * promote/demote toggle. Approving pending sign-ups stays on the separate
 * /admin/waitlist page -- this view is read-only except for the admin flag.
 */
"use client";

import { getAttendeeInitials } from "@/lib/attendees";

export type ProgramUserView = {
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

function formatJoinedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProgramUsersAdmin({
  users,
  loading,
  viewerUserId,
  pendingToggleId,
  onToggleAdmin,
}: {
  users: ProgramUserView[] | null;
  loading: boolean;
  viewerUserId: string | null;
  pendingToggleId: string | null;
  onToggleAdmin: (user: ProgramUserView) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted">Loading users...</p>;
  }

  if (!users || users.length === 0) {
    return (
      <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-medium text-foreground">No users yet</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {users.map((user) => {
        const label = user.name?.trim() || user.email;
        const isSelf = user.id === viewerUserId;
        return (
          <li
            key={user.id}
            className="glass-card flex items-center justify-between gap-4 rounded-2xl p-4"
            data-testid={`program-user-row-${user.id}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-neutral-200 text-[11px] font-semibold text-neutral-700">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={label}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getAttendeeInitials(user.name)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  {label}
                  {user.isAdmin && (
                    <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                      Admin
                    </span>
                  )}
                  {!user.approved && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Pending
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-muted">
                  {user.email} -- Joined {formatJoinedDate(user.createdAt)}
                </p>
                <p className="truncate text-sm text-muted">
                  {user.eventsCreatedCount} event
                  {user.eventsCreatedCount === 1 ? "" : "s"}, {user.rsvpCount} RSVP
                  {user.rsvpCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleAdmin(user)}
              disabled={isSelf || pendingToggleId === user.id}
              title={isSelf ? "You can't change your own admin status" : undefined}
              className="btn-secondary whitespace-nowrap disabled:opacity-60"
              data-testid={`toggle-admin-${user.id}`}
            >
              {pendingToggleId === user.id
                ? "Saving..."
                : user.isAdmin
                  ? "Remove admin"
                  : "Make admin"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/unit/program-users-admin.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProgramUsersAdmin.tsx tests/unit/program-users-admin.test.ts
git commit -m "feat(feed): add ProgramUsersAdmin component"
```

---

### Task 5: Wire the Users tab into `FeedApp.tsx`

**Files:**
- Modify: `src/components/FeedApp.tsx`

**Interfaces:**
- Consumes: `ProgramUsersAdmin`, `type ProgramUserView` from `@/components/ProgramUsersAdmin` (Task 4); `GET`/`PATCH /api/admin/users` (Task 3).
- Produces: nothing new consumed by later tasks — this is the last code task.

- [ ] **Step 1: Add the import**

In `src/components/FeedApp.tsx`, add to the imports (after the
`AdminEventCard` import, line 26):

```ts
import { AdminEventCard } from "@/components/AdminEventCard";
import { ProgramUsersAdmin, type ProgramUserView } from "@/components/ProgramUsersAdmin";
```

- [ ] **Step 2: Add state**

After the existing `const [viewerIsAdmin, setViewerIsAdmin] = useState(false);`
(line 61), add:

```ts
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<"events" | "users">("events");
  const [programUsers, setProgramUsers] = useState<ProgramUserView[] | null>(null);
  const [programUsersLoading, setProgramUsersLoading] = useState(false);
  const [programUsersViewerId, setProgramUsersViewerId] = useState<string | null>(
    null,
  );
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
```

- [ ] **Step 3: Add the load function and lazy-load effect**

After the `loadFeed` callback (after its closing `}, []);` around line 104),
add:

```ts
  /** Load the full user roster for the Admin tab's Users view (lazy, on first open). */
  const loadProgramUsers = useCallback(async () => {
    setProgramUsersLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load users");
      setProgramUsers(data.users as ProgramUserView[]);
      setProgramUsersViewerId(data.viewerUserId as string);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setProgramUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (
      activeTab === "admin" &&
      adminSubTab === "users" &&
      programUsers === null &&
      !programUsersLoading
    ) {
      void loadProgramUsers();
    }
  }, [activeTab, adminSubTab, programUsers, programUsersLoading, loadProgramUsers]);
```

- [ ] **Step 4: Add the toggle handler**

After the `handleDelete` function (after its closing `}` around line 366),
add:

```ts
  async function handleToggleAdmin(user: ProgramUserView) {
    const nextIsAdmin = !user.isAdmin;
    const label = user.name?.trim() || user.email;
    const confirmMessage = nextIsAdmin
      ? `Make ${label} an admin?`
      : `Remove admin access from ${label}?`;

    if (!window.confirm(confirmMessage)) return;

    setPendingToggleId(user.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isAdmin: nextIsAdmin }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Update failed");

      setProgramUsers((prev) =>
        prev?.map((u) => (u.id === user.id ? { ...u, isAdmin: nextIsAdmin } : u)) ??
        prev,
      );
      setToast(
        nextIsAdmin ? `${label} is now an admin` : `${label} is no longer an admin`,
      );
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPendingToggleId(null);
    }
  }
```

- [ ] **Step 5: Replace `adminContent` with the segmented-control version**

Current block (lines 520-556):

```tsx
  const adminContent = (
    <div className="space-y-4" data-testid="admin-tab">
      <div>
        <p className="text-sm font-medium text-foreground">
          {loading
            ? "Loading events..."
            : `${events.length} event${events.length === 1 ? "" : "s"}`}
        </p>
        <p className="text-sm text-muted">
          Who added each event and who&apos;s going
        </p>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : events.length === 0 ? (
        <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground">No events yet</p>
          <p className="mt-2 text-sm text-muted">
            Paste a link to share with your group.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {events.map((event) => (
            <AdminEventCard
              key={event.id}
              event={event}
              isExiting={Boolean(exitingEventIds[event.id])}
              onDelete={() => handleDelete(event.id)}
              onOpen={() => setDetailEvent(event)}
            />
          ))}
        </div>
      )}
    </div>
  );
```

Replace with:

```tsx
  const adminContent = (
    <div className="space-y-4" data-testid="admin-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {adminSubTab === "events"
              ? loading
                ? "Loading events..."
                : `${events.length} event${events.length === 1 ? "" : "s"}`
              : programUsersLoading
                ? "Loading users..."
                : `${programUsers?.length ?? 0} user${
                    programUsers?.length === 1 ? "" : "s"
                  }`}
          </p>
          <p className="text-sm text-muted">
            {adminSubTab === "events"
              ? "Who added each event and who's going"
              : "Everyone signed up, with admin and approval status"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" data-testid="admin-sub-tabs">
          {(["events", "users"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAdminSubTab(value)}
              className={`filter-pill ${
                adminSubTab === value ? "filter-pill-active" : "filter-pill-inactive"
              }`}
              data-testid={`admin-sub-tab-${value}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {adminSubTab === "events" ? (
        loading ? (
          <FeedSkeleton />
        ) : events.length === 0 ? (
          <div className="glass-card rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-medium text-foreground">No events yet</p>
            <p className="mt-2 text-sm text-muted">
              Paste a link to share with your group.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => (
              <AdminEventCard
                key={event.id}
                event={event}
                isExiting={Boolean(exitingEventIds[event.id])}
                onDelete={() => handleDelete(event.id)}
                onOpen={() => setDetailEvent(event)}
              />
            ))}
          </div>
        )
      ) : (
        <ProgramUsersAdmin
          users={programUsers}
          loading={programUsersLoading}
          viewerUserId={programUsersViewerId}
          pendingToggleId={pendingToggleId}
          onToggleAdmin={handleToggleAdmin}
        />
      )}
    </div>
  );
```

- [ ] **Step 6: Run typecheck, lint, and the full test suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all clean/PASS.

- [ ] **Step 7: Manual smoke test**

Run: `npm run dev`, sign in as an admin (an email in `ADMIN_EMAILS` or a
user with `is_admin = true`), open the Admin tab, click the `users` pill,
confirm the roster loads with correct counts/badges, click "Make admin" /
"Remove admin" on a non-self row and confirm the toast and badge update,
confirm the toggle is disabled on your own row.

- [ ] **Step 8: Commit**

```bash
git add src/components/FeedApp.tsx
git commit -m "feat(feed): wire the Users view into the Admin tab"
```

---

### Task 6: Changelog and version bump

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`

- [ ] **Step 1: Add the changelog entry**

Check the version heading currently at the top of `CHANGELOG.md` and the
`version` field in `package.json` before writing this entry — other work has
landed release entries on this repo concurrently, so the "previous version"
may no longer be v0.1.1 by the time this task runs. Insert the new entry
above whatever the current top entry is, and bump the version one minor
above whatever `package.json` currently has (e.g. if `package.json` says
`0.2.0`, the new entry is `## v0.3.0`).

```markdown
## v<NEXT>

2026-07-08

**Feed**

- The Admin tab now has a Users view listing everyone in the program with their admin/pending status and how many events they've added and RSVP'd to.

**Auth**

- Admins can promote or demote another user's admin access from the new Users view (you can't change your own).
- A manual admin promotion now survives the next sign-in instead of being silently reverted by the ADMIN_EMAILS allowlist sync.

---
```

- [ ] **Step 2: Bump the version**

In `package.json`, bump the `version` field to the same `<NEXT>` value used
in the changelog heading above.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release v<NEXT>"
```

---
