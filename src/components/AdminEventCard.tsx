/**
 * Admin tab card — creator and attendees first, event details secondary.
 */
"use client";

import { formatCardDateTime } from "@/lib/dates";
import { getAttendeeInitials } from "@/lib/attendees";
import { AttendeeStack } from "@/components/AttendeeStack";
import type { FeedEvent } from "@/types/feed";

export function AdminEventCard({
  event,
  onDelete,
  onOpen,
  isExiting = false,
}: {
  event: FeedEvent;
  onDelete: () => void;
  onOpen: () => void;
  isExiting?: boolean;
}) {
  const creator = event.addedBy;
  const creatorLabel = creator?.name?.trim() || creator?.email || "Unknown user";

  return (
    <article
      className={`glass-card relative overflow-hidden rounded-2xl transition ${
        isExiting ? "event-card-exiting" : ""
      }`}
      data-testid={`admin-event-card-${event.id}`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="btn-delete absolute right-3 top-3 z-10 px-2.5 py-1 text-xs"
        aria-label={`Delete ${event.title}`}
        data-testid="delete-event-button"
      >
        Delete
      </button>

      <div className="space-y-4 p-4 pr-14">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Added by
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-neutral-200 text-[11px] font-semibold text-neutral-700">
                {creator?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={creator.image}
                    alt={creatorLabel}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  getAttendeeInitials(creator?.name ?? null)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {creatorLabel}
                </p>
                {creator?.email && creator.name && (
                  <p className="truncate text-xs text-muted">{creator.email}</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
              Who&apos;s interested
            </p>
            <AttendeeStack
              attendees={event.attendees}
              acceptCount={event.acceptCount}
              showSocialCopy
              showCount={false}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-left transition hover:bg-surface-muted"
        >
          <p className="text-xs font-medium text-muted">
            {formatCardDateTime(event.startAt)}
          </p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {event.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            {event.hostName
              ? `Hosted by ${event.hostName}`
              : event.isOnline
                ? "Online"
                : event.location || "Location TBD"}
          </p>
        </button>
      </div>
    </article>
  );
}
