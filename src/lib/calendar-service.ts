/**
 * Calendar connection + sync orchestration -- the app-facing layer over
 * syncLumaCalendar.
 *
 * The per-user luma_ical_url is a secret: it is read and written only here via
 * the admin client and never returned to the client. Callers get a connection
 * status (connected? last synced when?), never the URL itself.
 */
import { getInsforgeAdmin } from "@/lib/db";
import {
  isLumaIcalUrl,
  syncLumaCalendar,
  type LumaSyncResult,
} from "@/lib/luma-calendar";

/** On feed load, re-sync a member's calendar at most this often. */
export const CALENDAR_STALE_MS = 15 * 60 * 1000;

export type CalendarConnection = {
  connected: boolean;
  syncedAt: string | null;
};

export async function getCalendarConnection(
  userId: string,
): Promise<CalendarConnection> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .select("luma_ical_url, luma_ical_synced_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    connected: Boolean(data?.luma_ical_url),
    syncedAt: data?.luma_ical_synced_at ?? null,
  };
}

export async function connectCalendar(
  userId: string,
  icalUrl: string,
): Promise<void> {
  const trimmed = icalUrl.trim();
  if (!isLumaIcalUrl(trimmed)) {
    throw new Error("That does not look like a Luma iCal subscription link");
  }

  const db = getInsforgeAdmin();
  // Clear synced_at so the first load treats the new calendar as stale.
  const { error } = await db.database
    .from("users")
    .update({ luma_ical_url: trimmed, luma_ical_synced_at: null })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function disconnectCalendar(userId: string): Promise<void> {
  const db = getInsforgeAdmin();
  const { error } = await db.database
    .from("users")
    .update({ luma_ical_url: null, luma_ical_synced_at: null })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export type CalendarSyncOutcome =
  | { status: "not-connected" }
  | { status: "fresh"; syncedAt: string }
  | ({ status: "synced"; syncedAt: string } & LumaSyncResult);

/**
 * Sync a member's calendar. Skips the network entirely when the last sync is
 * still fresh (unless forced), which is what makes it safe to call on every
 * feed load without a cron job.
 */
export async function syncCalendarForUser(
  userId: string,
  options: { force?: boolean } = {},
): Promise<CalendarSyncOutcome> {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .select("luma_ical_url, luma_ical_synced_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const icalUrl = data?.luma_ical_url;
  if (!icalUrl) return { status: "not-connected" };

  const syncedAt: string | null = data?.luma_ical_synced_at ?? null;
  if (!options.force && syncedAt && !isStale(syncedAt)) {
    return { status: "fresh", syncedAt };
  }

  const result = await syncLumaCalendar(icalUrl, userId);

  // Advance the timestamp even on a feed error so one broken sync does not
  // trigger a re-sync on every subsequent feed load; the member can force it.
  const nowIso = new Date().toISOString();
  const { error: stampError } = await db.database
    .from("users")
    .update({ luma_ical_synced_at: nowIso })
    .eq("id", userId);

  if (stampError) throw new Error(stampError.message);

  return { status: "synced", syncedAt: nowIso, ...result };
}

function isStale(syncedAtIso: string): boolean {
  const syncedAt = Date.parse(syncedAtIso);
  if (Number.isNaN(syncedAt)) return true;
  return Date.now() - syncedAt > CALENDAR_STALE_MS;
}
