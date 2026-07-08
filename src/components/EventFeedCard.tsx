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
import { EventTitleLink } from "@/components/EventTitleLink";
import { RemoveInterestAction } from "@/components/RemoveInterestAction";
import type { RemoveInterestLayout } from "@/lib/event-card-ui";
import type { FeedEvent } from "@/types/feed";

type CardStatus = "pending" | "accepted" | "passed" | "accepting";

export function EventFeedCard({
  event,
  status,
  onAccept,
  onPass,
  onUnpass,
  onUnaccept,
  onDelete,
  onOpen,
  showPassedActions = false,
  showAcceptedActions = false,
  removeInterestLayout = "stacked",
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
  onOpen: () => void;
  showPassedActions?: boolean;
  showAcceptedActions?: boolean;
  removeInterestLayout?: RemoveInterestLayout;
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
      className={`glass-card relative row-span-3 grid grid-rows-subgrid gap-3 overflow-hidden rounded-2xl transition ${
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

      <div className={`flex gap-3.5 px-4 pt-4 ${isAdmin && onDelete ? "pr-14" : ""}`}>
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

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="w-full text-left"
            aria-label={`Open details for ${event.title}`}
          >
            <p className="text-xs font-medium text-muted">
              {formatCardDateTime(event.startAt)}
            </p>
          </button>
          <EventTitleLink title={event.title} lumaUrl={event.lumaUrl} />
          <button
            type="button"
            onClick={onOpen}
            className="w-full text-left"
            aria-label={`Open details for ${event.title}`}
          >
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
        {accepted && showAcceptedActions ? (
          <RemoveInterestAction
            layout={removeInterestLayout}
            onUnaccept={onUnaccept}
          />
        ) : accepted ? (
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
            >
              {status === "accepting" ? "Accepting..." : "Accept"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
