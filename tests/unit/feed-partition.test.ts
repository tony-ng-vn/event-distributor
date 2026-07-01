import { describe, expect, it } from "vitest";
import {
  isPastFeedEvent,
  partitionFeedEvents,
} from "@/lib/feed-partition";
import type { FeedEvent } from "@/types/feed";

function makeEvent(overrides: Partial<FeedEvent> = {}): FeedEvent {
  return {
    id: "evt-1",
    lumaUrl: "https://lu.ma/demo",
    title: "Demo Event",
    description: "",
    coverImageUrl: null,
    startAt: "2026-07-15T18:00:00.000Z",
    endAt: "2026-07-15T20:00:00.000Z",
    location: "Online",
    isOnline: true,
    meetingUrl: null,
    hostName: "Host",
    hostAvatarUrl: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    acceptCount: 0,
    attendees: [],
    viewerAccepted: false,
    viewerPassed: false,
    ...overrides,
  };
}

describe("feed partition", () => {
  it("treats unresponded events as new", () => {
    const event = makeEvent();
    expect(isPastFeedEvent(event, {}, [])).toBe(false);

    const { newEvents, pastEvents } = partitionFeedEvents({
      events: [event],
      cardState: {},
      passedIds: [],
    });

    expect(newEvents).toHaveLength(1);
    expect(pastEvents).toHaveLength(0);
  });

  it("moves accepted events to past", () => {
    const event = makeEvent({ viewerAccepted: true });
    expect(isPastFeedEvent(event, {}, [])).toBe(true);

    const { newEvents, pastEvents } = partitionFeedEvents({
      events: [event],
      cardState: {},
      passedIds: [],
    });

    expect(newEvents).toHaveLength(0);
    expect(pastEvents).toHaveLength(1);
  });

  it("moves passed events to past via server flag or local state", () => {
    const serverPassed = makeEvent({ id: "passed-server", viewerPassed: true });
    const localPassed = makeEvent({ id: "passed-local" });

    expect(isPastFeedEvent(serverPassed, {}, [])).toBe(true);
    expect(
      isPastFeedEvent(localPassed, { "passed-local": "passed" }, []),
    ).toBe(true);
    expect(
      isPastFeedEvent(localPassed, {}, ["passed-local"]),
    ).toBe(true);
  });

  it("partitions a mixed feed", () => {
    const fresh = makeEvent({ id: "fresh" });
    const going = makeEvent({ id: "going", viewerAccepted: true });
    const skipped = makeEvent({ id: "skipped", viewerPassed: true });

    const { newEvents, pastEvents } = partitionFeedEvents({
      events: [fresh, going, skipped],
      cardState: {},
      passedIds: [],
    });

    expect(newEvents.map((event) => event.id)).toEqual(["fresh"]);
    expect(pastEvents.map((event) => event.id)).toEqual(["going", "skipped"]);
  });

  it("pending filter shows only new section events", () => {
    const fresh = makeEvent({ id: "fresh" });
    const going = makeEvent({ id: "going", viewerAccepted: true });

    const { newEvents, pastEvents } = partitionFeedEvents({
      events: [fresh, going],
      cardState: {},
      passedIds: [],
      filter: "pending",
    });

    expect(newEvents.map((event) => event.id)).toEqual(["fresh"]);
    expect(pastEvents).toHaveLength(0);
  });

  it("accepted filter shows only accepted past events", () => {
    const fresh = makeEvent({ id: "fresh" });
    const going = makeEvent({ id: "going", viewerAccepted: true });
    const skipped = makeEvent({ id: "skipped", viewerPassed: true });

    const { newEvents, pastEvents } = partitionFeedEvents({
      events: [fresh, going, skipped],
      cardState: {},
      passedIds: [],
      filter: "accepted",
    });

    expect(newEvents).toHaveLength(0);
    expect(pastEvents.map((event) => event.id)).toEqual(["going"]);
  });
});
