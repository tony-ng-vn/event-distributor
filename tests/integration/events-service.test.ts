/**
 * Integration tests for events-service (InsForge + Luma mock ingest/accept).
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { isUserAdmin } from "@/lib/admin";
import { getInsforgeAdmin } from "@/lib/db";
import { newId } from "@/lib/ids";
import {
  acceptEvent,
  createUser,
  deleteEvent,
  ingestLumaEvent,
  listFeedEvents,
  passEvent,
  previewLumaIngest,
  resetDatabase,
  starEvent,
  unacceptEvent,
  unpassEvent,
  unstarEvent,
} from "@/lib/events-service";
import { classifyAndPersistEvent } from "@/lib/event-type-classifier";
import * as luma from "@/lib/event-page";

describe("events service", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("ingests a mock Luma event into the shared feed", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    expect(event.title).toBeTruthy();
    expect(event.coverImageUrl).toMatch(/^https:\/\/images\.lumacdn\.com\//);
    expect(event.lumaUrl).toBe("https://lu.ma/demo-ai-meetup");
    expect(event.primaryType).toBe("other");
    expect(event.typeSource).toBe("untyped");

    const feed = await listFeedEvents();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.id).toBe(event.id);
  });

  it("classifies an ingested event with rules without blocking ingest", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    expect(event.typeSource).toBe("untyped");

    const result = await classifyAndPersistEvent(event.id, { mode: "rules" });
    expect(result?.primaryType).toBe("builders");
    expect(result?.source).toBe("rules");

    const feed = await listFeedEvents();
    expect(feed[0]?.primaryType).toBe("builders");
    expect(feed[0]?.typeSource).toBe("rules");
  });

  it("rejects duplicate Luma URLs", async () => {
    await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    await expect(ingestLumaEvent("https://lu.ma/demo-ai-meetup")).rejects.toThrow(
      /already/i,
    );
  });

  it("ingests a generic https event link into the shared feed", async () => {
    const sourceUrl =
      "https://www.anthropic.com/webinars/voice-and-intelligence?utm_medium=email";
    const event = await ingestLumaEvent(sourceUrl);

    expect(event.title).toBeTruthy();
    expect(event.lumaUrl).toBe(
      "https://anthropic.com/webinars/voice-and-intelligence",
    );

    const feed = await listFeedEvents();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.id).toBe(event.id);
  });

  it("rejects non-https and unsafe event URLs", async () => {
    await expect(
      ingestLumaEvent("http://example.com/event"),
    ).rejects.toThrow(/valid https/i);
    await expect(
      ingestLumaEvent("https://localhost/private-event"),
    ).rejects.toThrow(/valid https/i);
  });

  it("rejects ingest and preview when event page validation fails", async () => {
    vi.spyOn(luma, "fetchEventMetadata").mockRejectedValueOnce(
      new Error(luma.INVALID_EVENT_PAGE_MESSAGE),
    );
    await expect(ingestLumaEvent("https://lu.ma/bogus-slug")).rejects.toThrow(
      luma.INVALID_EVENT_PAGE_MESSAGE,
    );

    vi.spyOn(luma, "fetchEventMetadata").mockRejectedValueOnce(
      new Error(luma.INVALID_EVENT_PAGE_MESSAGE),
    );
    await expect(previewLumaIngest("https://lu.ma/bogus-slug")).rejects.toThrow(
      luma.INVALID_EVENT_PAGE_MESSAGE,
    );
  });

  it("records accept without calendar sync", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({
      email: "guest@example.com",
      name: "Guest User",
    });

    const accepted = await acceptEvent(event.id, user.id);
    expect(accepted.viewerAccepted).toBe(true);
    expect(accepted.acceptCount).toBe(1);
    expect(accepted.attendees[0]?.name).toBe("Guest User");
  });

  it("unacceptEvent removes interest so event returns to new feed section", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({
      email: "guest@example.com",
      name: "Guest User",
    });

    await acceptEvent(event.id, user.id);
    expect((await listFeedEvents(user.id))[0]?.viewerAccepted).toBe(true);

    const unaccepted = await unacceptEvent(event.id, user.id);
    expect(unaccepted.viewerAccepted).toBe(false);
    expect(unaccepted.acceptCount).toBe(0);
    expect(unaccepted.attendees).toHaveLength(0);

    const feed = await listFeedEvents(user.id);
    expect(feed).toHaveLength(1);
    expect(feed[0]?.viewerAccepted).toBe(false);
  });

  it("allows admin to delete any event and blocks non-admin", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin User",
      isAdmin: true,
    });
    const regular = await createUser({
      email: "regular@example.com",
      name: "Regular User",
    });

    expect(await isUserAdmin(admin.id)).toBe(true);
    expect(await isUserAdmin(regular.id)).toBe(false);

    await expect(deleteEvent(event.id, regular.id)).rejects.toThrow(/admin/i);

    const result = await deleteEvent(event.id, admin.id);
    expect(result.deleted).toBe(true);
    expect(result.title).toBe(event.title);

    const feed = await listFeedEvents();
    expect(feed).toHaveLength(0);
  });

  it("treats delete of a missing event as idempotent success", async () => {
    const admin = await createUser({
      email: "admin@example.com",
      name: "Admin User",
      isAdmin: true,
    });

    const result = await deleteEvent("missing-event-id", admin.id);
    expect(result.deleted).toBe(false);
    expect(result.title).toBeNull();
  });

  it("includes pass attendees on feed events", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const passer = await createUser({
      email: "passer@example.com",
      name: "Passer User",
    });
    const otherPasser = await createUser({
      email: "other-passer@example.com",
      name: "Other Passer",
    });

    await passEvent(event.id, passer.id);
    await passEvent(event.id, otherPasser.id);

    const feed = await listFeedEvents();
    expect(feed[0]?.passCount).toBe(2);
    expect(feed[0]?.passAttendees.map((person) => person.name)).toEqual([
      "Passer User",
      "Other Passer",
    ]);
  });

  it("includes passed events in feed with viewerPassed flag for that user only", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const passer = await createUser({
      email: "passer@example.com",
      name: "Passer User",
    });
    const other = await createUser({
      email: "other@example.com",
      name: "Other User",
    });

    await passEvent(event.id, passer.id);

    const passerFeed = await listFeedEvents(passer.id);
    expect(passerFeed).toHaveLength(1);
    expect(passerFeed[0]?.viewerPassed).toBe(true);

    const otherFeed = await listFeedEvents(other.id);
    expect(otherFeed).toHaveLength(1);
    expect(otherFeed[0]?.viewerPassed).toBe(false);

    const anonFeed = await listFeedEvents();
    expect(anonFeed).toHaveLength(1);
    expect(anonFeed[0]?.viewerPassed).toBe(false);
  });

  it("starEvent records a personal star with viewerStarred true", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({
      email: "starrer@example.com",
      name: "Starrer User",
    });

    const starred = await starEvent(event.id, user.id);
    expect(starred.viewerStarred).toBe(true);

    const feed = await listFeedEvents(user.id);
    expect(feed[0]?.viewerStarred).toBe(true);
  });

  it("unstarEvent removes the personal star", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({
      email: "starrer@example.com",
      name: "Starrer User",
    });

    await starEvent(event.id, user.id);
    const unstarred = await unstarEvent(event.id, user.id);
    expect(unstarred.viewerStarred).toBe(false);

    const feed = await listFeedEvents(user.id);
    expect(feed[0]?.viewerStarred).toBe(false);
  });

  it("starEvent is idempotent (double star keeps a single row)", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({ email: "starrer@example.com" });

    await starEvent(event.id, user.id);
    const second = await starEvent(event.id, user.id);
    expect(second.viewerStarred).toBe(true);

    const db = getInsforgeAdmin();
    const { data } = await db.database
      .from("stars")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id);
    expect(data).toHaveLength(1);
  });

  it("keeps viewerStarred private to the user who starred", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const starrer = await createUser({ email: "starrer@example.com" });
    const other = await createUser({ email: "other@example.com" });

    await starEvent(event.id, starrer.id);

    expect((await listFeedEvents(starrer.id))[0]?.viewerStarred).toBe(true);
    expect((await listFeedEvents(other.id))[0]?.viewerStarred).toBe(false);
    expect((await listFeedEvents())[0]?.viewerStarred).toBe(false);
  });

  it("leaves accept/pass state untouched when starring", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({ email: "starrer@example.com" });

    await acceptEvent(event.id, user.id);
    const starred = await starEvent(event.id, user.id);

    expect(starred.viewerStarred).toBe(true);
    expect(starred.viewerAccepted).toBe(true);
    expect(starred.viewerPassed).toBe(false);
  });

  it("includes creator on feed events when added_by_user_id is set", async () => {
    const creator = await createUser({
      email: "creator@example.com",
      name: "Creator User",
    });
    const event = await ingestLumaEvent(
      "https://lu.ma/demo-ai-meetup",
      creator.id,
    );

    expect(event.addedBy).toEqual({
      id: creator.id,
      name: "Creator User",
      image: null,
      email: "creator@example.com",
    });

    const feed = await listFeedEvents();
    expect(feed[0]?.addedBy?.name).toBe("Creator User");
  });

  it("keeps events visible after their start date has passed", async () => {
    const db = getInsforgeAdmin();
    const pastStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const pastEnd = new Date(pastStart.getTime() + 2 * 60 * 60 * 1000);

    const { data: inserted, error } = await db.database
      .from("events")
      .insert([
        {
          id: newId(),
          luma_url: "https://lu.ma/past-event-test",
          title: "Past Community Meetup",
          description: "An event from a few days ago",
          cover_image_url: null,
          start_at: pastStart.toISOString(),
          end_at: pastEnd.toISOString(),
          location: "San Francisco, CA",
          is_online: false,
          meeting_url: null,
          host_name: "Community Host",
          host_avatar_url: null,
          added_by_user_id: null,
        },
      ])
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(inserted?.id).toBeTruthy();

    const feed = await listFeedEvents();
    expect(feed.some((event) => event.id === inserted?.id)).toBe(true);
    expect(feed.some((event) => event.title === "Past Community Meetup")).toBe(
      true,
    );
  });

  it("listFeedEvents includes passed events with viewerPassed flag", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const passer = await createUser({
      email: "passer@example.com",
      name: "Passer User",
    });

    await passEvent(event.id, passer.id);

    const allEvents = await listFeedEvents(passer.id);
    expect(allEvents).toHaveLength(1);
    expect(allEvents[0]?.id).toBe(event.id);
    expect(allEvents[0]?.viewerPassed).toBe(true);
    expect(allEvents[0]?.viewerAccepted).toBe(false);
  });

  it("unpassEvent removes pass so event reappears in feed", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const user = await createUser({
      email: "user@example.com",
      name: "User",
    });

    await passEvent(event.id, user.id);
    expect((await listFeedEvents(user.id))[0]?.viewerPassed).toBe(true);

    await unpassEvent(event.id, user.id);

    const feed = await listFeedEvents(user.id);
    expect(feed).toHaveLength(1);
    expect(feed[0]?.viewerPassed).toBe(false);

    const allEvents = await listFeedEvents(user.id);
    expect(allEvents[0]?.viewerPassed).toBe(false);
  });
});
