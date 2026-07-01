/**
 * One event in the social-row card layout.
 *
 * Sections: thumbnail + title row → "Who's going" strip → Pass/Accept buttons.
 * Accept requires sign-in; Pass is client-only (handled in FeedApp).
 */
"use client";

import { formatCardDateTime } from "@/lib/dates";
import { EventAttendeeSections } from "@/components/EventAttendeeSections";
import { EventResponseStatus } from "@/components/EventResponseStatus";
import { LumaEventLink } from "@/components/LumaEventLink";
import type { FeedEvent } from "@/types/feed";

type CardStatus = "pending" | "accepted" | "passed" | "accepting";

export function EventFeedCard({
  event,
  status,
  onAccept,
  onPass,
  onUnpass,
  onDelete,
  onOpen,
  showPassedActions = false,
  isAdmin = false,
  isExiting = false,
}: {
  event: FeedEvent;
  status: CardStatus;
  onAccept: () => void;
  onPass: () => void;
  onUnpass?: () => void;
  onDelete?: () => void;
  onOpen: () => void;
  showPassedActions?: boolean;
  isAdmin?: boolean;
  isExiting?: boolean;
}) {
  const accepted = status === "accepted" || event.viewerAccepted;
  const passed = status === "passed" || event.viewerPassed;
  const subtitle = event.hostName
    ? `Hosted by ${event.hostName}`
    : event.isOnline
      ? "Online"
      : event.location || "Location TBD";

  return (
    <article
      className={`glass-card relative overflow-hidden rounded-2xl transition ${
        passed && !accepted ? "opacity-75" : ""
      } ${isExiting ? "event-card-exiting" : ""}`}
      data-testid={`event-card-${event.id}`}
    >
      {isAdmin && onDelete && (
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
      )}

      <div className={`flex gap-3.5 p-4 ${isAdmin && onDelete ? "pr-14" : ""}`}>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 overflow-hidden rounded-xl bg-surface-muted"
          aria-label={`Open ${event.title}`}
        >
          <div className="h-[72px] w-[72px] lg:h-20 lg:w-20">
            {event.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.coverImageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                No image
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-xs font-medium text-muted">
            {formatCardDateTime(event.startAt)}
          </p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {event.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{subtitle}</p>
        </button>
      </div>

      <EventAttendeeSections event={event} showSocialCopy showCount={false} />

      <div className="px-4 pb-4">
        {accepted ? (
          <EventResponseStatus variant="accepted" />
        ) : passed && showPassedActions ? (
          <div className="space-y-2">
            <EventResponseStatus variant="passed" />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onUnpass}
                className="btn-pass py-3"
                data-testid="unpass-button"
              >
                Undo pass
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={status === "accepting"}
                className="btn-accept py-3 disabled:opacity-60"
                data-testid="accept-button"
              >
                {status === "accepting" ? "Accepting..." : "Accept"}
              </button>
            </div>
          </div>
        ) : passed ? (
          <EventResponseStatus variant="passed" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onPass}
              className="btn-pass py-3"
              data-testid="pass-button"
            >
              Pass
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={status === "accepting"}
              className="btn-accept py-3 disabled:opacity-60"
              data-testid="accept-button"
            >
              {status === "accepting" ? "Accepting..." : "Accept"}
            </button>
          </div>
        )}

        <LumaEventLink lumaUrl={event.lumaUrl} className="mt-3" />
      </div>
    </article>
  );
}
