/**
 * Time-based lifecycle helpers for events (Luma-style).
 *
 * Live  -- started but not yet ended (start <= now <= end). Stays in the feed
 *          with a "Live" badge.
 * Ended -- end has passed. Hidden from the shared feed at read time; you can
 *          still reach it via its external link.
 *
 * The read-time feed filter is the source of truth for what disappears; the
 * daily archive job (archived_at) is housekeeping on top of the same rule.
 */

type EventWindow = { startAt: string; endAt: string };

/** True while an event is in progress: start <= now <= end (inclusive). */
export function isLiveEvent(event: EventWindow, now: Date = new Date()): boolean {
  const start = new Date(event.startAt).getTime();
  const end = new Date(event.endAt).getTime();
  const t = now.getTime();
  return start <= t && t <= end;
}

type FeedVisibilityRow = { end_at: string; archived_at?: string | null };

/**
 * A shared-feed row is visible only while it is not archived and has not ended.
 * Operates on the raw DB row (snake_case) so it can run before serialize.
 */
export function isFeedVisibleRow(
  row: FeedVisibilityRow,
  now: Date = new Date(),
): boolean {
  if (row.archived_at != null) return false;
  return new Date(row.end_at).getTime() >= now.getTime();
}
