/**
 * Full list of people interested in an event (in-app Accept, not Luma RSVP).
 */
"use client";

import { getAttendeeInitials } from "@/lib/attendees";
import type { FeedEvent } from "@/types/feed";

export function AttendeeListModal({
  open,
  onClose,
  eventTitle,
  attendees,
  acceptCount,
}: {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  attendees: FeedEvent["attendees"];
  acceptCount: number;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-card w-full max-w-md rounded-2xl p-6"
        data-testid="attendee-list-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendee-list-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="attendee-list-title"
              className="text-lg font-semibold text-foreground"
            >
              Who&apos;s interested
            </h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted hover:bg-background-subtle"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 text-xs text-muted">
          {acceptCount} {acceptCount === 1 ? "person" : "people"} marked interested
          in-app — RSVP on Luma separately.
        </p>

        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {attendees.map((attendee) => (
            <li
              key={attendee.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-background-subtle px-3 py-2.5"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-neutral-200 text-xs font-semibold text-neutral-700">
                {attendee.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attendee.image}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getAttendeeInitials(attendee.name)
                )}
              </span>
              <span className="text-sm font-medium text-foreground">
                {attendee.name?.trim() || "Friend"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
