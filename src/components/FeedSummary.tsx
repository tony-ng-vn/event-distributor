/**
 * Top-of-feed bar: "5 friends have plans · 3 events shared" with avatar preview.
 * Only shown when there are events in the feed (FeedApp).
 */
"use client";

import { collectUniqueAttendees, getAttendeeInitials } from "@/lib/attendees";
import type { FeedEvent } from "@/types/feed";

const AVATAR_CLASSES = [
  "bg-neutral-200 text-neutral-600",
  "bg-neutral-300 text-neutral-700",
  "bg-neutral-400 text-neutral-800",
] as const;

export function FeedSummary({
  events,
}: {
  events: FeedEvent[];
}) {
  if (events.length === 0) return null;

  const uniqueAttendees = collectUniqueAttendees(events);
  const previewAttendees = uniqueAttendees.slice(0, 3);
  const overflow = uniqueAttendees.length - previewAttendees.length;
  const friendLabel =
    uniqueAttendees.length === 1 ? "friend" : "friends";

  return (
    <section className="feed-summary" data-testid="feed-summary">
      <div className="flex -space-x-2">
        {previewAttendees.map((attendee, index) => (
          <span
            key={attendee.id}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface text-[11px] font-semibold ${AVATAR_CLASSES[index % AVATAR_CLASSES.length]}`}
            title={attendee.name ?? "Guest"}
          >
            {attendee.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attendee.image}
                alt={attendee.name ?? "Guest"}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              getAttendeeInitials(attendee.name)
            )}
          </span>
        ))}
        {overflow > 0 && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-surface-muted text-[10px] font-semibold text-muted">
            +{overflow}
          </span>
        )}
      </div>
      <p className="text-sm text-foreground-secondary">
        {uniqueAttendees.length > 0 ? (
          <>
            <span className="font-semibold text-foreground">
              {uniqueAttendees.length} {friendLabel}
            </span>
            {" have plans · "}
          </>
        ) : null}
        <span className="font-semibold text-foreground">{events.length}</span>
        {` event${events.length === 1 ? "" : "s"} shared`}
      </p>
    </section>
  );
}
