/**
 * The "Your events" tab now renders the same EventFeedCard as the main feed
 * (status "accepted"), so the two match exactly. These tests lock that in:
 * the cover image (or "No image" placeholder) shows, the remove-interest control
 * is present for an interested event, and no "View on Luma" link remains -- the
 * feed dropped it and Your events must not bring it back.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventFeedCard } from "@/components/EventFeedCard";
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

const noop = () => {};

function renderAcceptedCard(event: FeedEvent, onUnaccept: () => void = noop) {
  return renderToStaticMarkup(
    createElement(EventFeedCard, {
      event,
      status: "accepted",
      onAccept: noop,
      onPass: noop,
      onUnaccept,
      onOpen: noop,
    }),
  );
}

describe("your-events list cover image", () => {
  it("renders the cover image when the event has one", () => {
    const html = renderAcceptedCard(
      makeEvent({
        id: "with-cover",
        coverImageUrl: "https://example.com/cover.jpg",
      }),
    );

    expect(html).toContain('src="https://example.com/cover.jpg"');
    expect(html).not.toContain("No image");
  });

  it("renders a No image placeholder when the cover is null", () => {
    const html = renderAcceptedCard(
      makeEvent({ id: "no-cover", coverImageUrl: null }),
    );

    expect(html).toContain("No image");
    expect(html).not.toContain("<img");
  });
});

describe("your-events list remove-interest control", () => {
  it("shows the remove-interest button for an interested event", () => {
    const html = renderAcceptedCard(
      makeEvent({ id: "interested", viewerAccepted: true }),
    );

    expect(html).toContain('data-testid="unaccept-button"');
    expect(html).toContain("Remove interest");
  });
});

describe("your-events list matches the feed", () => {
  it("links the title like the feed and never shows a View on Luma link", () => {
    const html = renderAcceptedCard(
      makeEvent({ id: "linked", lumaUrl: "https://lu.ma/demo" }),
    );

    // Same linked title as the feed card.
    expect(html).toContain('data-testid="event-title-link"');
    // The feed removed the standalone "View on Luma" link; Your events must too.
    expect(html).not.toContain("View on Luma");
  });
});
