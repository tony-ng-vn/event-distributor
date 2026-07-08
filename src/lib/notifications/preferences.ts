/**
 * CRUD for notification_preferences plus the recipient query the dispatcher uses.
 *
 * All access goes through the InsForge admin client (RLS is bypassed server-side;
 * callers must have already authenticated the viewer). RLS on the table is
 * defense-in-depth for any direct client access.
 */
import { getInsforgeAdmin } from "@/lib/db";
import { selectEmailRecipients } from "@/lib/notifications/recipients";
import type { EmailRecipient } from "@/lib/notifications/types";

export type NotificationPreference = {
  userId: string;
  emailEnabled: boolean;
  hasResponded: boolean;
};

type PreferenceRow = {
  user_id: string;
  email_enabled: boolean;
  has_responded: boolean;
};

/** Defaults for a user who has never answered the opt-in prompt. */
export function defaultPreference(userId: string): NotificationPreference {
  return { userId, emailEnabled: false, hasResponded: false };
}

function toPreference(row: PreferenceRow): NotificationPreference {
  return {
    userId: row.user_id,
    emailEnabled: row.email_enabled,
    hasResponded: row.has_responded,
  };
}

/** Current preference row, or defaults when the user has no row yet. */
export async function getNotificationPreference(
  userId: string,
): Promise<NotificationPreference> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("notification_preferences")
    .select("user_id, email_enabled, has_responded")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return defaultPreference(userId);
  return toPreference(data as PreferenceRow);
}

/**
 * Create or update the user's row. Always stamps updated_at (no DB trigger) and
 * marks has_responded true unless the caller overrides it.
 */
export async function upsertNotificationPreference(
  userId: string,
  input: { emailEnabled: boolean; hasResponded?: boolean },
): Promise<NotificationPreference> {
  const db = getInsforgeAdmin();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await db.database
    .from("notification_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  const hasResponded = input.hasResponded ?? true;

  if (existing) {
    const { data, error } = await db.database
      .from("notification_preferences")
      .update({
        email_enabled: input.emailEnabled,
        has_responded: hasResponded,
        updated_at: now,
      })
      .eq("user_id", userId)
      .select("user_id, email_enabled, has_responded")
      .single();

    if (error) throw new Error(error.message);
    return toPreference(data as PreferenceRow);
  }

  const { data, error } = await db.database
    .from("notification_preferences")
    .insert([
      {
        user_id: userId,
        email_enabled: input.emailEnabled,
        has_responded: hasResponded,
        created_at: now,
        updated_at: now,
      },
    ])
    .select("user_id, email_enabled, has_responded")
    .single();

  if (error) throw new Error(error.message);
  return toPreference(data as PreferenceRow);
}

/** Flip email off without touching has_responded. Used by the unsubscribe link. */
export async function disableEmailForUser(userId: string): Promise<void> {
  const db = getInsforgeAdmin();
  const now = new Date().toISOString();

  const { data: existing, error: existingError } = await db.database
    .from("notification_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await db.database
      .from("notification_preferences")
      .update({ email_enabled: false, has_responded: true, updated_at: now })
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await db.database
    .from("notification_preferences")
    .insert([
      {
        user_id: userId,
        email_enabled: false,
        has_responded: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  if (error) throw new Error(error.message);
}

type UserContactRow = { id: string; email: string | null; name: string | null };

/**
 * Every email-enabled user except the actor, with their address.
 *
 * Two explicit queries instead of a PostgREST embed: the embed would depend on
 * FK relationship auto-detection (this codebase distrusts that -- see the
 * explicit `users!added_by_user_id` hint in events-service), and a silent embed
 * failure would mean notifications quietly never send. Two queries make the join
 * deterministic.
 */
export async function loadEmailRecipients(
  actorUserId: string | null,
): Promise<EmailRecipient[]> {
  const db = getInsforgeAdmin();

  const { data: prefRows, error: prefError } = await db.database
    .from("notification_preferences")
    .select("user_id")
    .eq("email_enabled", true);

  if (prefError) throw new Error(prefError.message);

  const userIds = (prefRows ?? []).map((row) => row.user_id as string);
  if (userIds.length === 0) return [];

  const { data: userRows, error: userError } = await db.database
    .from("users")
    .select("id, email, name")
    .in("id", userIds);

  if (userError) throw new Error(userError.message);

  const rows = ((userRows ?? []) as UserContactRow[]).map((user) => ({
    user_id: user.id,
    email_enabled: true,
    email: user.email,
    name: user.name,
  }));

  return selectEmailRecipients(rows, actorUserId);
}
