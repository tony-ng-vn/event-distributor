/**
 * Waitlist access gate.
 *
 * Sign-up stays open, but a new account is pending (`approved = false`) and sees
 * no event data until an admin lets it in. The "waitlist" is simply the set of
 * users still pending. Approval is a boolean on the user row so the gate is one
 * cheap read on every request.
 */
import { getAdminEmails, isAdminEmail, isUserAdmin } from "@/lib/admin";
import { getInsforgeAdmin } from "@/lib/db";

/**
 * Emails let in automatically on sign-in: admins, plus anyone the owner lists in
 * APPROVED_EMAILS. Lets known friends who have not signed up yet skip the queue.
 */
export function getPreapprovedEmails(): string[] {
  const raw = process.env.APPROVED_EMAILS;
  const fromEnv = raw?.trim()
    ? raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return Array.from(new Set([...getAdminEmails(), ...fromEnv]));
}

export function isEmailPreapproved(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return isAdminEmail(normalized) || getPreapprovedEmails().includes(normalized);
}

/** True once the user has been let past the waitlist. */
export async function isUserApproved(userId: string): Promise<boolean> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .select("approved")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.approved === true;
}

export type WaitlistUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
};

/** Admin view: everyone still waiting, oldest request first. */
export async function listWaitlistUsers(): Promise<WaitlistUser[]> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .select("id, email, name, image, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string | null) ?? null,
    image: (row.image as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

/** Admin action: let a pending user into the app. Idempotent. */
export async function approveUser(
  adminUserId: string,
  userId: string,
): Promise<void> {
  const admin = await isUserAdmin(adminUserId);
  if (!admin) {
    throw new Error("Admin privileges required to approve users");
  }

  const db = getInsforgeAdmin();
  const { error } = await db.database
    .from("users")
    .update({ approved: true })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Admin action: remove a pending user from the waitlist by hard-deleting their
 * row. Scoped to `approved = false` so this path can never delete an approved
 * member, which also makes it an idempotent no-op for already-gone or
 * already-approved users.
 */
export async function deleteWaitlistUser(
  adminUserId: string,
  userId: string,
): Promise<void> {
  const admin = await isUserAdmin(adminUserId);
  if (!admin) {
    throw new Error("Admin privileges required to remove users");
  }

  const db = getInsforgeAdmin();
  const { error } = await db.database
    .from("users")
    .delete()
    .eq("id", userId)
    .eq("approved", false);

  if (error) throw new Error(error.message);
}

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

/** Tallies rows into a count keyed by one of their user-id columns, skipping nulls. */
function countByUserId(
  rows: Array<Record<string, unknown>>,
  column: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const userId = row[column] as string | null;
    if (!userId) continue;
    counts.set(userId, (counts.get(userId) ?? 0) + 1);
  }
  return counts;
}

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

  const eventCounts = countByUserId(eventsResult.data ?? [], "added_by_user_id");
  const rsvpCounts = countByUserId(acceptsResult.data ?? [], "user_id");

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
  // Load-bearing: the PATCH route only enforces "approved", not "admin" -- this is the only admin gate.
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
