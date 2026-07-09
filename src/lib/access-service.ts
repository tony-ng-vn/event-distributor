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
