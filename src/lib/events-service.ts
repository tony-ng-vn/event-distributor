/**
 * Core business logic for the shared event feed (InsForge Postgres).
 *
 * Flow:
 *   1. ingestLumaEvent — paste lu.ma URL → fetch metadata → save Event row
 *   2. listFeedEvents — load events + who accepted (Accept → User)
 *   3. acceptEvent — signed-in user joins guest list (creates Accept row)
 *   4. unacceptEvent — signed-in user removes interest (deletes Accept row)
 *   5. passEvent — signed-in user marks event as passed (creates Pass row)
 */
import { isUserAdmin } from "@/lib/admin";
import { assertDestructiveWritesAllowed } from "@/lib/db-safety";
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";
import { scheduleEventIngestedNotification } from "@/lib/notifications/notify";
import {
  fetchEventMetadata,
  isEventSourceUrl,
  normalizeSourceUrl,
  type LumaMetadata,
} from "@/lib/event-page";
import type { FeedEvent } from "@/types/feed";

type AttendeeSummary = FeedEvent["attendees"][number];
type CreatorSummary = NonNullable<FeedEvent["addedBy"]>;

type InsforgeUser = {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
};

type InsforgeAcceptRow = {
  id: string;
  accepted_at: string;
  users: InsforgeUser | InsforgeUser[] | null;
};

type InsforgePassRow = {
  id: string;
  passed_at: string;
  users: InsforgeUser | InsforgeUser[] | null;
};

// Stars are private: we only ever need user_id to derive the viewer's own
// boolean, so we do not embed the nested user object (keeps the payload small).
type InsforgeStarRow = {
  id: string;
  user_id: string;
};

type InsforgeEventRow = {
  id: string;
  luma_url: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  start_at: string;
  end_at: string;
  location: string;
  is_online: boolean;
  meeting_url: string | null;
  host_name: string | null;
  host_avatar_url: string | null;
  created_at: string;
  accepts: InsforgeAcceptRow[] | null;
  passes: InsforgePassRow[] | null;
  stars: InsforgeStarRow[] | null;
  added_by_user: InsforgeUser | InsforgeUser[] | null;
};

function normalizeUser(
  users: InsforgeUser | InsforgeUser[] | null | undefined,
): InsforgeUser | null {
  if (!users) return null;
  return Array.isArray(users) ? (users[0] ?? null) : users;
}

function serializeCreator(
  users: InsforgeUser | InsforgeUser[] | null | undefined,
): CreatorSummary | null {
  const user = normalizeUser(users);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    image: user.image,
    email: user.email ?? null,
  };
}

function mapAttendeeSummaries(
  rows: { users: InsforgeUser | InsforgeUser[] | null }[],
): AttendeeSummary[] {
  return rows
    .map((row) => normalizeUser(row.users))
    .filter((user): user is InsforgeUser => user !== null)
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
    }));
}

function serializeEvent(
  event: InsforgeEventRow,
  viewerUserId?: string | null,
): FeedEvent {
  const attendees = mapAttendeeSummaries(event.accepts ?? []);
  const passAttendees = mapAttendeeSummaries(event.passes ?? []);

  return {
    id: event.id,
    lumaUrl: event.luma_url,
    title: event.title,
    description: event.description,
    coverImageUrl: event.cover_image_url,
    startAt: event.start_at,
    endAt: event.end_at,
    location: event.location,
    isOnline: event.is_online,
    meetingUrl: event.meeting_url,
    hostName: event.host_name,
    hostAvatarUrl: event.host_avatar_url,
    createdAt: event.created_at,
    acceptCount: attendees.length,
    attendees,
    passCount: passAttendees.length,
    passAttendees,
    viewerAccepted: viewerUserId
      ? attendees.some((a) => a.id === viewerUserId)
      : false,
    viewerPassed: viewerUserId
      ? passAttendees.some((a) => a.id === viewerUserId)
      : false,
    viewerStarred: viewerUserId
      ? (event.stars ?? []).some((s) => s.user_id === viewerUserId)
      : false,
    addedBy: serializeCreator(event.added_by_user),
  };
}

const eventSelect =
  "*, added_by_user:users!added_by_user_id(id, name, image, email), accepts(id, accepted_at, users(id, name, image)), passes(id, passed_at, users(id, name, image)), stars(id, user_id)";

function sortFeedEventRows(events: InsforgeEventRow[]) {
  const now = Date.now();

  return [...events].sort((a, b) => {
    const aStart = new Date(a.start_at).getTime();
    const bStart = new Date(b.start_at).getTime();
    const aUpcoming = aStart >= now;
    const bUpcoming = bStart >= now;

    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (aUpcoming && bUpcoming) return aStart - bStart;
    return bStart - aStart;
  });
}

async function fetchAllEventRows() {
  const db = getInsforgeAdmin();

  const { data, error } = await db.database
    .from("events")
    .select(eventSelect);

  if (error) throw new Error(error.message);

  const events = sortFeedEventRows((data ?? []) as InsforgeEventRow[]);

  events.forEach((event) => {
    if (event.accepts) {
      event.accepts.sort(
        (a, b) =>
          new Date(a.accepted_at).getTime() - new Date(b.accepted_at).getTime(),
      );
    }
    if (event.passes) {
      event.passes.sort(
        (a, b) =>
          new Date(a.passed_at).getTime() - new Date(b.passed_at).getTime(),
      );
    }
  });

  return events;
}

/** GET /api/events -- all persisted events (partitioned per-viewer in Feed UI). */
export async function listFeedEvents(viewerUserId?: string | null) {
  const events = await fetchAllEventRows();
  return events.map((event) => serializeEvent(event, viewerUserId));
}

/** POST ingest with preview:true — fetch event metadata without saving. */
export async function previewLumaIngest(lumaUrl: string): Promise<LumaMetadata> {
  if (!isEventSourceUrl(lumaUrl)) {
    throw new Error("URL must be a valid https event link");
  }
  const normalized = normalizeSourceUrl(lumaUrl);
  return fetchEventMetadata(normalized);
}

/** POST ingest — fetch event page and insert into shared feed (one URL per event). */
export async function ingestLumaEvent(lumaUrl: string, addedByUserId?: string) {
  if (!isEventSourceUrl(lumaUrl)) {
    throw new Error("URL must be a valid https event link");
  }

  const db = getInsforgeAdmin();
  const normalized = normalizeSourceUrl(lumaUrl);

  const { data: existing, error: existingError } = await db.database
    .from("events")
    .select("id")
    .eq("luma_url", normalized)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    throw new Error("This event is already in the feed");
  }

  const metadata = await fetchEventMetadata(normalized);

  const { data: event, error } = await db.database
    .from("events")
    .insert([
      {
        id: newId(),
        luma_url: normalized,
        title: metadata.title,
        description: metadata.description,
        cover_image_url: metadata.coverImageUrl,
        start_at: metadata.startAt.toISOString(),
        end_at: metadata.endAt.toISOString(),
        location: metadata.location,
        is_online: metadata.isOnline,
        meeting_url: metadata.meetingUrl,
        host_name: metadata.hostName,
        host_avatar_url: null,
        added_by_user_id: addedByUserId ?? null,
      },
    ])
    .select(eventSelect)
    .single();

  if (error) throw new Error(error.message);

  const serialized = serializeEvent(event as InsforgeEventRow);

  // Single notification seam: emit after a successful write. Delivery is async
  // and failure-isolated, so it never slows or breaks ingest.
  scheduleEventIngestedNotification({
    id: serialized.id,
    title: serialized.title,
    startAt: serialized.startAt,
    isOnline: serialized.isOnline,
    location: serialized.location,
    addedBy: serialized.addedBy
      ? { id: serialized.addedBy.id, name: serialized.addedBy.name }
      : null,
  });

  return serialized;
}

/** Shared accept/pass precondition -- clear errors instead of raw FK failures. */
async function assertEventAndUserExist(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  const { data: event, error: eventError } = await db.database
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error("Event not found");

  const { data: user, error: userError } = await db.database
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (userError) throw new Error(userError.message);
  if (!user) throw new Error("User not found");
}

/** Re-read one event with all embeds and serialize it for the viewer. */
async function reloadSerializedEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  const { data: updated, error: updatedError } = await db.database
    .from("events")
    .select(eventSelect)
    .eq("id", eventId)
    .single();

  if (updatedError) throw new Error(updatedError.message);

  return serializeEvent(updated as InsforgeEventRow, userId);
}

/** POST /api/events/[id]/accept — user joins in-app guest list (not Luma RSVP). */
export async function acceptEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  await assertEventAndUserExist(eventId, userId);

  const { data: existing, error: existingError } = await db.database
    .from("accepts")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (!existing) {
    const { error: insertError } = await db.database.from("accepts").insert([
      {
        id: newId(),
        event_id: eventId,
        user_id: userId,
      },
    ]);

    if (insertError) throw new Error(insertError.message);
  }

  await unpassEvent(eventId, userId);

  return reloadSerializedEvent(eventId, userId);
}

/** DELETE accept — remove user interest from in-app guest list. No-op if not accepted. */
export async function unacceptEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  const { error: deleteError } = await db.database
    .from("accepts")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (deleteError) throw new Error(deleteError.message);

  return reloadSerializedEvent(eventId, userId);
}

/** POST /api/events/[id]/pass — mark event as passed for viewer (Past events section). */
export async function passEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  await assertEventAndUserExist(eventId, userId);

  const { data: existing, error: existingError } = await db.database
    .from("passes")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (!existing) {
    const { error: insertError } = await db.database.from("passes").insert([
      {
        id: newId(),
        event_id: eventId,
        user_id: userId,
      },
    ]);

    if (insertError) throw new Error(insertError.message);
  }
}

/** DELETE pass — restore event to viewer feed. No-op if not passed. */
export async function unpassEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  const { error: deleteError } = await db.database
    .from("passes")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (deleteError) throw new Error(deleteError.message);
}

/** POST /api/events/[id]/star — pin the event to the viewer's personal Starred
 *  section. Idempotent; orthogonal to accept/pass (does not touch either). */
export async function starEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  await assertEventAndUserExist(eventId, userId);

  const { data: existing, error: existingError } = await db.database
    .from("stars")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (!existing) {
    const { error: insertError } = await db.database.from("stars").insert([
      {
        id: newId(),
        event_id: eventId,
        user_id: userId,
      },
    ]);

    if (insertError) throw new Error(insertError.message);
  }

  return reloadSerializedEvent(eventId, userId);
}

/** DELETE star — remove the personal pin. No-op if not starred. */
export async function unstarEvent(eventId: string, userId: string) {
  const db = getInsforgeAdmin();

  const { error: deleteError } = await db.database
    .from("stars")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (deleteError) throw new Error(deleteError.message);

  return reloadSerializedEvent(eventId, userId);
}

export type DeleteEventResult = {
  title: string | null;
  deleted: boolean;
};

/** DELETE /api/events/[id] — remove event from shared feed (admin only). */
export async function deleteEvent(
  eventId: string,
  userId: string,
): Promise<DeleteEventResult> {
  const admin = await isUserAdmin(userId);
  if (!admin) {
    throw new Error("Admin privileges required to delete events");
  }

  const db = getInsforgeAdmin();

  const { data: deletedRows, error: deleteError } = await db.database
    .from("events")
    .delete()
    .eq("id", eventId)
    .select("id, title");

  if (deleteError) throw new Error(deleteError.message);

  const deleted = (deletedRows ?? []) as Array<{ id: string; title: string }>;
  if (deleted.length > 0) {
    return { title: deleted[0]?.title ?? null, deleted: true };
  }

  const { data: existing, error: existingError } = await db.database
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    throw new Error("Could not delete event");
  }

  return { title: null, deleted: false };
}

/** Wipes all data — used by tests only. */
export async function resetDatabase() {
  assertDestructiveWritesAllowed("resetDatabase");

  const db = getInsforgeAdmin();
  const { error: starsError } = await db.database
    .from("stars")
    .delete()
    .gte("starred_at", "1970-01-01T00:00:00Z");
  if (starsError) throw new Error(starsError.message);

  const { error: passesError } = await db.database
    .from("passes")
    .delete()
    .gte("passed_at", "1970-01-01T00:00:00Z");
  if (passesError) throw new Error(passesError.message);

  const { error: acceptsError } = await db.database
    .from("accepts")
    .delete()
    .gte("accepted_at", "1970-01-01T00:00:00Z");
  if (acceptsError) throw new Error(acceptsError.message);

  const { error: eventsError } = await db.database
    .from("events")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00Z");
  if (eventsError) throw new Error(eventsError.message);

  const { error: usersError } = await db.database
    .from("users")
    .delete()
    .gte("created_at", "1970-01-01T00:00:00Z");
  if (usersError) throw new Error(usersError.message);
}

export async function seedDemoEvent() {
  await resetDatabase();
  return ingestLumaEvent("https://lu.ma/demo-ai-meetup");
}

/** Test helper — create a user row without Clerk. */
export async function createUser(input: {
  email: string;
  name?: string | null;
  clerkId?: string | null;
  isAdmin?: boolean;
  approved?: boolean;
}) {
  const db = getInsforgeAdmin();
  const { data, error } = await db.database
    .from("users")
    .insert([
      {
        id: newId(),
        email: input.email,
        name: input.name ?? null,
        clerk_id: input.clerkId ?? null,
        is_admin: input.isAdmin ?? false,
        approved: input.approved ?? false,
      },
    ])
    .select("id, email, name, image, clerk_id, is_admin, approved")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
