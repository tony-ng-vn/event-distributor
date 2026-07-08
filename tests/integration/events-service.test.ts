/**
 * Integration tests for events-service (InsForge + Luma mock ingest/accept).
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { isUserAdmin } from "@/lib/admin";
import {
  acceptEvent,
  createUser,
  deleteEvent,
  ingestLumaEvent,
  listAllFeedEvents,
  listFeedEvents,
  passEvent,
  previewLumaIngest,
  resetDatabase,
  unacceptEvent,
  unpassEvent,
} from "@/lib/events-service";
import * as luma from "@/lib/luma";

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
