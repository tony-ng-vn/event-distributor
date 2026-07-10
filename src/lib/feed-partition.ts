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
  /** Optimistic per-event star overrides; falls back to event.viewerStarred. */
  starState?: Record<string, boolean | undefined>;
};

/** A personal pin: local optimistic state wins over the server flag. */
export function isStarredEvent(
  event: FeedEvent,
  starState: Record<string, boolean | undefined>,
): boolean {
  return starState[event.id] ?? event.viewerStarred;
}

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
  starState = {},
}: FeedPartitionInput) {
  const starredEvents: FeedEvent[] = [];
  const newEvents: FeedEvent[] = [];
  const pastEvents: FeedEvent[] = [];

  for (const event of events) {
    if (!matchesDateFilter(event, selectedDate)) continue;

    // A starred event is lifted into its own pinned section (no duplicate) and
    // stays there regardless of the pending/accepted pill -- a personal pin
    // should always be visible at the top. Star wins even over "passed".
    if (isStarredEvent(event, starState)) {
      starredEvents.push(event);
      continue;
    }

    const isPast = isPastFeedEvent(event, cardState, passedIds);
    if (!matchesFilterPill(event, filter, cardState, isPast)) {
      continue;
    }

    if (isPast) pastEvents.push(event);
    else newEvents.push(event);
  }

  return { starredEvents, newEvents, pastEvents };
}
