/**
 * Core business logic for the shared event feed (InsForge Postgres).
 *
 * Flow:
 *   1. ingestLumaEvent — paste lu.ma URL → fetch metadata → save Event row
 *   2. listFeedEvents — load events + who accepted (Accept → User)
 *   3. acceptEvent — signed-in user joins guest list (creates Accept row)
 *   4. passEvent — signed-in user hides event from their feed (creates Pass row)
 */
import { isUserAdmin } from "@/lib/admin";
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";
import {
  fetchLumaMetadata,
  isLumaUrl,
  normalizeLumaUrl,
  type LumaMetadata,
} from "@/lib/luma";

export type AttendeeSummary = {
  id: string;
  name: string | null;
  image: string | null;
};

export type CreatorSummary = {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
};

export type FeedEvent = {
  id: string;
  lumaUrl: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean;
  meetingUrl: string | null;
  hostName: string | null;
  hostAvatarUrl: string | null;
  createdAt: string;
  acceptCount: number;
  attendees: AttendeeSummary[];
  viewerAccepted: boolean;
  viewerPassed: boolean;
  addedBy: CreatorSummary | null;
};

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

function serializeEvent(
  event: InsforgeEventRow,
  viewerUserId?: string | null,
  viewerPassed = false,
): FeedEvent {
  const accepts = event.accepts ?? [];
  const attendees = accepts
    .map((accept) => normalizeUser(accept.users))
    .filter((user): user is InsforgeUser => user !== null)
    .map((user) => ({
      id: user.id,
      name: user.name,
      image: user.image,
    }));

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
    viewerAccepted: viewerUserId
      ? attendees.some((a) => a.id === viewerUserId)
      : false,
    viewerPassed,
    addedBy: serializeCreator(event.added_by_user),
  };
}

const eventSelect =
  "*, added_by_user:users!added_by_user_id(id, name, image, email), accepts(id, accepted_at, users(id, name, image))";

async function fetchUpcomingEventRows() {
  const db = getInsforgeAdmin();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db.database
    .from("events")
    .select(eventSelect)
    .gte("start_at", cutoff)
    .order("start_at", { ascending: true });

  if (error) throw new Error(error.message);

  const events = (data ?? []) as InsforgeEventRow[];

  events.forEach((event) => {
    if (event.accepts) {
      event.accepts.sort(
        (a, b) =>
          new Date(a.accepted_at).getTime() - new Date(b.accepted_at).getTime(),
      );
    }
  });

  return events;
}

async function getViewerPassedEventIds(
  viewerUserId: string,
): Promise<Set<string>> {
  const db = getInsforgeAdmin();
  const { data: passedRows, error: passError } = await db.database
    .from("passes")
    .select("event_id")
    .eq("user_id", viewerUserId);

  if (passError) throw new Error(passError.message);

  return new Set((passedRows ?? []).map((row) => row.event_id as string));
}

/** GET /api/events?scope=all — all upcoming events including passed ones. */
export async function listAllFeedEvents(viewerUserId?: string | null) {
  const events = await fetchUpcomingEventRows();
  const passedEventIds = viewerUserId
    ? await getViewerPassedEventIds(viewerUserId)
    : new Set<string>();

  return events.map((event) =>
    serializeEvent(
      event,
      viewerUserId,
      viewerUserId ? passedEventIds.has(event.id) : false,
    ),
  );
}

/** GET /api/events — upcoming events including passed (partitioned in Feed UI). */
export async function listFeedEvents(viewerUserId?: string | null) {
  return listAllFeedEvents(viewerUserId);
}

/** POST ingest with preview:true — fetch Luma metadata without saving. */
export async function previewLumaIngest(lumaUrl: string): Promise<LumaMetadata> {
  if (!isLumaUrl(lumaUrl)) {
    throw new Error("URL must be a Luma event link (lu.ma or luma.com)");
  }
  const normalized = normalizeLumaUrl(lumaUrl);
  return fetchLumaMetadata(normalized);
}

/** POST ingest — fetch Luma page and insert into shared feed (one URL per event). */
export async function ingestLumaEvent(lumaUrl: string, addedByUserId?: string) {
  if (!isLumaUrl(lumaUrl)) {
    throw new Error("URL must be a Luma event link (lu.ma or luma.com)");
  }

  const db = getInsforgeAdmin();
  const normalized = normalizeLumaUrl(lumaUrl);

  const { data: existing, error: existingError } = await db.database
    .from("events")
    .select("id")
    .eq("luma_url", normalized)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    throw new Error("This Luma event is already in the feed");
  }

  const metadata = await fetchLumaMetadata(normalized);

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

  return serializeEvent(event as InsforgeEventRow);
}

/** POST /api/events/[id]/accept — user joins in-app guest list (not Luma RSVP). */
export async function acceptEvent(eventId: string, userId: string) {
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

  const { data: updated, error: updatedError } = await db.database
    .from("events")
    .select(eventSelect)
    .eq("id", eventId)
    .single();

  if (updatedError) throw new Error(updatedError.message);

  return serializeEvent(updated as InsforgeEventRow, userId);
}

/** POST /api/events/[id]/pass — hide event from viewer feed (synced per user). */
export async function passEvent(eventId: string, userId: string) {
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

/** DELETE /api/events/[id] — remove event from shared feed (admin only). */
export async function deleteEvent(eventId: string, userId: string) {
  const admin = await isUserAdmin(userId);
  if (!admin) {
    throw new Error("Admin privileges required to delete events");
  }

  const db = getInsforgeAdmin();

  const { data: event, error: eventError } = await db.database
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!event) throw new Error("Event not found");

  const { error: deleteError } = await db.database
    .from("events")
    .delete()
    .eq("id", eventId);

  if (deleteError) throw new Error(deleteError.message);
}

/** Wipes all data — used by tests only. */
export async function resetDatabase() {
  const db = getInsforgeAdmin();
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
      },
    ])
    .select("id, email, name, image, clerk_id, is_admin")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
