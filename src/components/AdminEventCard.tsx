/**
 * Admin tab card — creator and attendees first, event details secondary.
 */
"use client";

import { formatDateTime } from "@/lib/dates";
import { getAttendeeInitials } from "@/lib/attendees";
import { EventAttendeeSections } from "@/components/EventAttendeeSections";
import { LumaEventLink } from "@/components/LumaEventLink";
import {
  EVENT_TYPE_IDS,
  eventTypeLabel,
  type EventTypeId,
} from "@/lib/event-type-taxonomy";
import type { FeedEvent } from "@/types/feed";

export function AdminEventCard({
  event,
  onDelete,
  onOpen,
  onTypeChange,
  isExiting = false,
  typeUpdating = false,
}: {
  event: FeedEvent;
  onDelete: () => void;
  onOpen: () => void;
  onTypeChange?: (primaryType: EventTypeId) => void;
  isExiting?: boolean;
  typeUpdating?: boolean;
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

          <EventAttendeeSections
            event={event}
            showSocialCopy
            showCount={false}
            className="[&_.going-strip]:mx-0"
          />
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="w-full rounded-xl border border-border bg-background-subtle px-4 py-3 text-left transition hover:bg-surface-muted"
        >
          <p className="text-xs font-medium text-muted">
            {formatDateTime(event.startAt)}
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

        {onTypeChange ? (
          <label className="block text-sm text-muted">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide">
              Event type
            </span>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
              value={event.primaryType}
              disabled={typeUpdating}
              data-testid="admin-event-type-select"
              onChange={(e) => {
                onTypeChange(e.target.value as EventTypeId);
              }}
            >
              {EVENT_TYPE_IDS.map((id) => (
                <option key={id} value={id}>
                  {eventTypeLabel(id)}
                  {event.typeSource === "untyped" && id === event.primaryType
                    ? " (pending)"
                    : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <LumaEventLink lumaUrl={event.lumaUrl} fullWidth />
      </div>
    </article>
  );
}
