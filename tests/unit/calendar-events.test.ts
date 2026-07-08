/**
 * Unit tests for selecting which events the calendar shows dots for, based on
 * which main tab is active: "mine" (Your events) shows only events the viewer
 * is going to; every other tab shows the full shared feed, matching today's
 * behavior.
 *
 * "Going to" mirrors FeedApp's own acceptedEvents predicate (viewerAccepted OR
 * an optimistic "accepted" cardState) so the calendar never disagrees with the
 * Your events list rendered right next to/below it, even before the accept
 * API call resolves.
 */
import { describe, expect, it } from "vitest";
import { selectCalendarEvents } from "@/lib/calendar-events";
import type { FeedEvent } from "@/types/feed";

function makeEvent(id: string, viewerAccepted: boolean): FeedEvent {
  return {
    id,
    lumaUrl: `https://lu.ma/${id}`,
    title: id,
    description: "",
    coverImageUrl: null,
    startAt: "2026-08-01T19:00:00.000Z",
    endAt: "2026-08-01T21:00:00.000Z",
    location: "",
    isOnline: false,
    meetingUrl: null,
    hostName: null,
    hostAvatarUrl: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    acceptCount: viewerAccepted ? 1 : 0,
    attendees: [],
    passCount: 0,
    passAttendees: [],
    viewerAccepted,
    viewerPassed: false,
    addedBy: null,
  };
}

describe("selectCalendarEvents", () => {
  const goingTo = makeEvent("going", true);
  const notGoingTo = makeEvent("not-going", false);
  const optimistic = makeEvent("optimistic", false);
  const events = [goingTo, notGoingTo, optimistic];

  it('shows only events the viewer is going to when "mine" is active', () => {
    expect(
      selectCalendarEvents({ events, activeTab: "mine", cardState: {} }),
    ).toEqual([goingTo]);
  });

  it("includes an optimistically-accepted event before the server confirms", () => {
    expect(
      selectCalendarEvents({
        events,
        activeTab: "mine",
        cardState: { optimistic: "accepted" },
      }),
    ).toEqual([goingTo, optimistic]);
  });

  it('shows every event when "feed" (All Events) is active, ignoring cardState', () => {
    expect(
      selectCalendarEvents({ events, activeTab: "feed", cardState: {} }),
    ).toEqual(events);
  });

  it('shows every event when "admin" is active', () => {
    expect(
      selectCalendarEvents({ events, activeTab: "admin", cardState: {} }),
    ).toEqual(events);
  });

  it('shows every event when "calendar" is active', () => {
    expect(
      selectCalendarEvents({ events, activeTab: "calendar", cardState: {} }),
    ).toEqual(events);
  });

  it("returns an empty list unchanged regardless of tab", () => {
    expect(
      selectCalendarEvents({ events: [], activeTab: "mine", cardState: {} }),
    ).toEqual([]);
    expect(
      selectCalendarEvents({ events: [], activeTab: "feed", cardState: {} }),
    ).toEqual([]);
  });
});
