/**
 * One event in the social-row card layout.
 *
 * Sections: thumbnail + title row -> "Who's going" strip -> Pass/Interested buttons.
 * Interested requires sign-in and records interest, then opens the event page
 * in a new tab; Pass is client-only (handled in FeedApp).
 */
"use client";

import { formatDateTime } from "@/lib/dates";
import { EventAttendeeSections } from "@/components/EventAttendeeSections";
import { EventResponseStatus } from "@/components/EventResponseStatus";
import { EventThumbnail } from "@/components/EventThumbnail";
import { EventTitleLink } from "@/components/EventTitleLink";
import { RemoveInterestAction } from "@/components/RemoveInterestAction";
import { isLiveEvent } from "@/lib/event-status";
import type { CardStatus } from "@/lib/feed-partition";
import type { FeedEvent } from "@/types/feed";

export function EventFeedCard({
  event,
  status,
  onAccept,
  onPass,
  onUnpass,
  onUnaccept,
  onDelete,
  onStar,
  onOpen,
  starred = false,
  showPassedActions = false,
  isAdmin = false,
  isExiting = false,
}: {
  event: FeedEvent;
  status: CardStatus;
  onAccept: () => void;
  onPass: () => void;
  onUnpass?: () => void;
  onUnaccept?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onOpen: () => void;
  starred?: boolean;
  showPassedActions?: boolean;
  isAdmin?: boolean;
  isExiting?: boolean;
}) {
  const accepted = status === "accepted" || event.viewerAccepted;
  const passed = status === "passed" || event.viewerPassed;
  const live = isLiveEvent(event);
  const subtitle = event.hostName
    ? `Hosted by ${event.hostName}`
    : event.isOnline
      ? "Online"
      : event.location || "Location TBD";

  return (
    <article
      className={`glass-card group relative row-span-3 grid grid-rows-subgrid gap-3 overflow-hidden rounded-2xl transition ${
        passed && !accepted ? "opacity-75" : ""
      } ${isExiting ? "event-card-exiting" : ""}`}
      data-testid={`event-card-${event.id}`}
    >
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {onStar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
            // Revealed on hover/focus on desktop; always shown on touch and when
            // starred. See .btn-star in globals.css for the visibility rules.
            className={`btn-star ${starred ? "btn-star-on" : ""}`}
            aria-label={`${starred ? "Unstar" : "Star"} ${event.title}`}
            aria-pressed={starred}
            data-testid={`star-button-${event.id}`}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
              <path
                d="M10 1.6l2.47 5.005 5.525.803-3.997 3.896.944 5.503L10 14.213l-4.942 2.598.944-5.503L2.005 7.408l5.525-.803z"
                fill={starred ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {isAdmin && onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="btn-delete px-2.5 py-1 text-xs"
            aria-label={`Delete ${event.title}`}
            data-testid="delete-event-button"
          >
            Delete
          </button>
        )}
      </div>

      <div
        className={`flex gap-3.5 px-4 pt-4 ${
          isAdmin && onDelete ? "pr-24" : onStar ? "pr-12" : ""
        }`}
      >
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0"
          aria-label={`Open ${event.title}`}
        >
          <EventThumbnail event={event} />
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center gap-2 text-left"
            aria-label={`Open details for ${event.title}`}
          >
            {live && (
              <span
                className="live-badge"
                data-testid={`live-badge-${event.id}`}
              >
                <span className="live-badge-dot" aria-hidden="true" />
                Live
              </span>
            )}
            <p className="text-xs font-medium text-muted">
              {formatDateTime(event.startAt)}
            </p>
          </button>
          <EventTitleLink title={event.title} lumaUrl={event.lumaUrl} />
          <button
            type="button"
            onClick={onOpen}
            className="w-full text-left"
          >
            {/* No aria-label here: the date button above already exposes
                "Open details for {title}", so this button is named by its own
                subtitle text instead of announcing the same label twice. */}
            <p className="mt-0.5 line-clamp-1 text-sm text-muted">{subtitle}</p>
          </button>
        </div>
      </div>

      <EventAttendeeSections
        event={event}
        showSocialCopy
        showCount={false}
        className="[&_.going-strip]:mb-0"
      />

      <div className="px-4 pb-4">
        {accepted ? (
          <RemoveInterestAction onUnaccept={onUnaccept} />
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
                aria-label={`Interested in ${event.title} -- opens the event page in a new tab`}
              >
                {status === "accepting" ? "Saving..." : "Interested"}
              </button>
            </div>
          </div>
        ) : passed ? (
          <EventResponseStatus variant="passed" />
        ) : (
          <div className="grid min-h-[2.75rem] grid-cols-2 gap-2 content-start">
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
              aria-label={`Interested in ${event.title} -- opens the event page in a new tab`}
            >
              {status === "accepting" ? "Saving..." : "Interested"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
