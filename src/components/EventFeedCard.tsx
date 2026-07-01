/**
 * One event in the social-row card layout.
 *
 * Sections: thumbnail + title row → "Who's going" strip → Pass/Accept buttons.
 * Accept requires sign-in; Pass is client-only (handled in FeedApp).
 */
"use client";

import { formatCardDateTime } from "@/lib/dates";
import { AttendeeStack } from "@/components/AttendeeStack";
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
      }`}
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

      <div className="going-strip">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
          Who&apos;s going
        </p>
        <AttendeeStack
          attendees={event.attendees}
          acceptCount={event.acceptCount}
          showSocialCopy
          showCount={false}
        />
      </div>

      <div className="px-4 pb-4">
        {accepted ? (
          <div
            className="rounded-xl border border-border bg-background-subtle px-4 py-3 text-sm"
            data-testid="accepted-state"
          >
            <p className="font-semibold text-foreground">You&apos;re going</p>
            <p className="mt-0.5 text-muted">On the guest list</p>
          </div>
        ) : passed && showPassedActions ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted">You passed on this</p>
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
          <p className="text-sm text-muted">Passed</p>
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

        <a
          href={event.lumaUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-foreground-secondary hover:text-foreground"
        >
          View on Luma ↗
        </a>
      </div>
    </article>
  );
}
