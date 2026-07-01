/**
 * Integration tests for events-service (InsForge + Luma mock ingest/accept).
 */
import { describe, expect, it, beforeEach } from "vitest";
import { isUserAdmin } from "@/lib/admin";
import {
  acceptEvent,
  createUser,
  deleteEvent,
  ingestLumaEvent,
  listAllFeedEvents,
  listFeedEvents,
  passEvent,
  resetDatabase,
  unpassEvent,
} from "@/lib/events-service";

describe("events service", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("ingests a mock Luma event into the shared feed", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    expect(event.title).toBeTruthy();
    expect(event.coverImageUrl).toMatch(/^https:\/\/images\.lumacdn\.com\//);
    expect(event.lumaUrl).toBe("https://lu.ma/demo-ai-meetup");

    const feed = await listFeedEvents();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.id).toBe(event.id);
  });

  it("rejects duplicate Luma URLs", async () => {
    await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    await expect(ingestLumaEvent("https://lu.ma/demo-ai-meetup")).rejects.toThrow(
      /already/i,
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

    await deleteEvent(event.id, admin.id);

    const feed = await listFeedEvents();
    expect(feed).toHaveLength(0);
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

    const feed = await listAllFeedEvents();
    expect(feed[0]?.addedBy?.name).toBe("Creator User");
  });

  it("listAllFeedEvents includes passed events with viewerPassed flag", async () => {
    const event = await ingestLumaEvent("https://lu.ma/demo-ai-meetup");
    const passer = await createUser({
      email: "passer@example.com",
      name: "Passer User",
    });

    await passEvent(event.id, passer.id);

    const allEvents = await listAllFeedEvents(passer.id);
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

    const allEvents = await listAllFeedEvents(user.id);
    expect(allEvents[0]?.viewerPassed).toBe(false);
  });
});
