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
