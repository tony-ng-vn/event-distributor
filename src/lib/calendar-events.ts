/**
 * Which events the calendar (aside on desktop, its own tab on mobile) shows
 * dots for, given the active main tab.
 *
 * "mine" (Your events) narrows the calendar to events the viewer is going to
 * -- the same predicate FeedApp's acceptedEvents memo uses (viewerAccepted OR
 * an optimistic "accepted" cardState), so the calendar never disagrees with
 * the Your events list next to it, even before an accept/unaccept round-trip
 * resolves. Every other tab (feed / admin / calendar) keeps today's behavior:
 * dots for the full shared feed.
 */
import type { CardStatus } from "@/lib/feed-partition";
import type { FeedEvent, MobileTab } from "@/types/feed";

export function selectCalendarEvents({
  events,
  activeTab,
  cardState,
}: {
  events: FeedEvent[];
  activeTab: MobileTab;
  cardState: Record<string, CardStatus | undefined>;
}): FeedEvent[] {
  if (activeTab !== "mine") return events;

  return events.filter(
    (event) => event.viewerAccepted || cardState[event.id] === "accepted",
  );
}
