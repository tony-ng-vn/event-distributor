import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventFeedCard } from "@/components/EventFeedCard";
import type { FeedEvent } from "@/types/feed";

const EVENT: FeedEvent = {
  id: "chai-night",
  lumaUrl: "https://lu.ma/chai-night",
  title: "Chai Night",
  description: "Cozy evening with chai.",
  coverImageUrl: null,
  startAt: "2026-07-09T19:00:00.000Z",
  endAt: "2026-07-09T21:00:00.000Z",
  location: "San Francisco, CA",
  isOnline: false,
  meetingUrl: null,
  hostName: null,
  hostAvatarUrl: null,
  createdAt: "2026-07-01T12:00:00.000Z",
  acceptCount: 0,
  attendees: [],
  passCount: 0,
  passAttendees: [],
  viewerAccepted: false,
  viewerPassed: false,
  viewerStarred: false,
  primaryType: "social",
  secondaryTypes: [],
  typeSource: "rules",
  addedBy: null,
};

function render(props: Partial<Parameters<typeof EventFeedCard>[0]>) {
  return renderToStaticMarkup(
    createElement(EventFeedCard, {
      event: EVENT,
      status: "pending",
      onAccept: () => undefined,
      onPass: () => undefined,
      onOpen: () => undefined,
      ...props,
    }),
  );
}

describe("EventFeedCard", () => {
  it("labels the primary action 'Interested', not 'Accept'", () => {
    const markup = render({ status: "pending" });
    expect(markup).toContain(">Interested<");
    expect(markup).not.toContain(">Accept<");
    // New-tab affordance is announced to assistive tech.
    expect(markup).toContain("opens the event page in a new tab");
  });

  it("shows the remove-interest control for an interested event even without showAcceptedActions", () => {
    // showAcceptedActions no longer exists: an interested event must always
    // expose a way to remove interest, in every feed context.
    const markup = render({ status: "accepted" });
    expect(markup).toContain('data-testid="unaccept-button"');
    expect(markup).toContain("Remove interest");
  });

  it("renders an unpressed star toggle labelled to star the event", () => {
    const markup = render({ starred: false, onStar: () => undefined });
    expect(markup).toContain('data-testid="star-button-chai-night"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Star Chai Night"');
  });

  it("renders a pressed star toggle labelled to unstar when already starred", () => {
    const markup = render({ starred: true, onStar: () => undefined });
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="Unstar Chai Night"');
  });

  it("shows a type label when the event is classified", () => {
    const markup = render({ status: "pending" });
    expect(markup).toContain('data-testid="event-type-label"');
    expect(markup).toContain("Social");
  });
});
