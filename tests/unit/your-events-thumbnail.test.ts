/**
 * The "Your events" list (CalendarEventList) must show each event's cover image,
 * matching the main feed card: an <img> when a cover exists, a "No image"
 * placeholder when it is null.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarEventList } from "@/components/MiniCalendar";
import type { FeedEvent } from "@/types/feed";

function makeEvent(overrides: Partial<FeedEvent>): FeedEvent {
  return {
    id: "evt-1",
    lumaUrl: "https://lu.ma/demo",
    title: "Demo Night",
    description: "A great event",
    coverImageUrl: null,
    startAt: "2026-08-01T19:00:00.000Z",
    endAt: "2026-08-01T21:00:00.000Z",
    location: "SF",
    isOnline: false,
    meetingUrl: null,
    hostName: null,
    hostAvatarUrl: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    acceptCount: 0,
    attendees: [],
    passCount: 0,
    passAttendees: [],
    viewerAccepted: true,
    viewerPassed: false,
    addedBy: null,
    ...overrides,
  };
}

describe("your-events list cover image", () => {
  it("renders the cover image when the event has one", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarEventList, {
        events: [
          makeEvent({
            id: "with-cover",
            coverImageUrl: "https://example.com/cover.jpg",
          }),
        ],
      }),
    );

    expect(html).toContain('src="https://example.com/cover.jpg"');
    expect(html).not.toContain("No image");
  });

  it("renders a No image placeholder when the cover is null", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarEventList, {
        events: [makeEvent({ id: "no-cover", coverImageUrl: null })],
      }),
    );

    expect(html).toContain("No image");
    expect(html).not.toContain("<img");
  });
});

describe("your-events list remove-interest control", () => {
  const noop = () => {};

  it("shows the remove-interest button for an interested event when onUnaccept is provided", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarEventList, {
        events: [makeEvent({ id: "interested", viewerAccepted: true })],
        onUnaccept: noop,
      }),
    );

    expect(html).toContain('data-testid="unaccept-button"');
    expect(html).toContain("Remove interest");
  });

  it("omits the remove-interest button when no onUnaccept handler is passed", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarEventList, {
        events: [makeEvent({ id: "interested", viewerAccepted: true })],
      }),
    );

    expect(html).not.toContain('data-testid="unaccept-button"');
  });
});
