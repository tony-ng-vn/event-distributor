/**
 * Slide-over panel with full event details (opens when you tap a card).
 * Same Accept/Pass actions as EventFeedCard.
 */
"use client";

import { formatDateTime } from "@/lib/dates";
import { EventAttendeeSections } from "@/components/EventAttendeeSections";
import { EventResponseStatus } from "@/components/EventResponseStatus";
import { LumaEventLink } from "@/components/LumaEventLink";
import type { FeedEvent } from "@/types/feed";

export function EventDetailSheet({
  event,
  onClose,
  onAccept,
  onPass,
  onUnpass,
  onDelete,
  accepted,
  passed,
  isAdmin,
  showPassedActions = false,
}: {
  event: FeedEvent | null;
  onClose: () => void;
  onAccept: () => void;
  onPass: () => void;
  onUnpass?: () => void;
  onDelete?: () => void;
  accepted: boolean;
  passed?: boolean;
  isAdmin?: boolean;
  showPassedActions?: boolean;
}) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/25 backdrop-blur-sm">
      <div
        className="glass-card h-full w-full max-w-md overflow-y-auto rounded-l-2xl"
        data-testid="event-detail-sheet"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="font-semibold text-foreground">Event details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted hover:bg-background-subtle"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          {event.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt=""
              className="aspect-video w-full rounded-xl object-cover shadow-sm"
            />
          )}

          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">
              {event.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{formatDateTime(event.startAt)}</p>
          </div>

          {event.hostName && (
            <p className="text-sm text-muted">Hosted by {event.hostName}</p>
          )}

          <p className="text-sm text-muted">
            {event.isOnline ? "Online" : event.location || "Location TBD"}
          </p>

          {event.description && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {event.description}
            </p>
          )}

          <EventAttendeeSections event={event} interactive showCount />

          {accepted ? (
            <EventResponseStatus variant="accepted" />
          ) : passed && showPassedActions ? (
            <div className="space-y-2">
              <EventResponseStatus variant="passed" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onUnpass}
                  className="btn-pass flex-1 py-3"
                  data-testid="unpass-button"
                >
                  Undo pass
                </button>
                <button type="button" onClick={onAccept} className="btn-accept flex-1 py-3">
                  Accept
                </button>
              </div>
            </div>
          ) : passed ? (
            <EventResponseStatus variant="passed" />
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onPass}
                className="btn-pass flex-1 py-3"
                data-testid="pass-button"
              >
                Pass
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="btn-accept flex-1 py-3"
                data-testid="accept-button"
              >
                Accept
              </button>
            </div>
          )}

          <LumaEventLink lumaUrl={event.lumaUrl} fullWidth />

          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="btn-delete w-full py-3"
              data-testid="delete-event-button"
            >
              Delete event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
