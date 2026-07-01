/**
 * Client-side partition of feed events into New vs Past sections.
 *
 * New — viewer has not accepted or passed yet.
 * Past — viewer has accepted or passed (still visible in feed, not hidden).
 */
import { isSameDay } from "@/lib/dates";
import type { FeedEvent, FeedFilter } from "@/types/feed";

export type CardStatus = "pending" | "accepted" | "passed" | "accepting";

export type FeedPartitionInput = {
  events: FeedEvent[];
  cardState: Record<string, CardStatus | undefined>;
  passedIds: string[];
  selectedDate?: Date | null;
  filter?: FeedFilter;
};

export function isPastFeedEvent(
  event: FeedEvent,
  cardState: Record<string, CardStatus | undefined>,
  passedIds: string[],
): boolean {
  const status = cardState[event.id];
  return (
    event.viewerAccepted ||
    event.viewerPassed ||
    status === "accepted" ||
    status === "passed" ||
    passedIds.includes(event.id)
  );
}

function matchesDateFilter(event: FeedEvent, selectedDate?: Date | null) {
  if (!selectedDate) return true;
  return isSameDay(new Date(event.startAt), selectedDate);
}

function matchesFilterPill(
  event: FeedEvent,
  filter: FeedFilter,
  cardState: Record<string, CardStatus | undefined>,
  isPast: boolean,
) {
  if (filter === "all") return true;
  if (filter === "pending") return !isPast;
  if (filter === "accepted") {
    const status = cardState[event.id];
    return (
      event.viewerAccepted ||
      status === "accepted" ||
      status === "accepting"
    );
  }
  return true;
}

export function partitionFeedEvents({
  events,
  cardState,
  passedIds,
  selectedDate = null,
  filter = "all",
}: FeedPartitionInput) {
  const newEvents: FeedEvent[] = [];
  const pastEvents: FeedEvent[] = [];

  for (const event of events) {
    if (!matchesDateFilter(event, selectedDate)) continue;

    const isPast = isPastFeedEvent(event, cardState, passedIds);
    if (!matchesFilterPill(event, filter, cardState, isPast)) {
      continue;
    }

    if (isPast) pastEvents.push(event);
    else newEvents.push(event);
  }

  return { newEvents, pastEvents };
}
