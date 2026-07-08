/**
 * Overlapping avatar circles + optional social copy.
 * When interactive, opens a modal with the full interested or passed list.
 */
"use client";

import { useState } from "react";
import { AttendeeListModal } from "@/components/AttendeeListModal";
import { avatarClass, getAttendeeInitials } from "@/lib/attendees";
import type { FeedEvent } from "@/types/feed";

type AttendeeStackVariant = "interested" | "passed";

function emptyStateCopy(variant: AttendeeStackVariant): string {
  switch (variant) {
    case "interested":
      return "Be the first to say you're in";
    case "passed":
      return "Nobody passed yet";
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function countLabel(variant: AttendeeStackVariant, count: number): string {
  switch (variant) {
    case "interested":
      return `${count} interested`;
    case "passed":
      return `${count} passed`;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

function listAriaLabel(variant: AttendeeStackVariant, eventTitle: string): string {
  switch (variant) {
    case "interested":
      return `See who is interested in ${eventTitle}`;
    case "passed":
      return `See who passed on ${eventTitle}`;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function AttendeeStack({
  attendees,
  acceptCount,
  variant = "interested",
  size = "md",
  showCount = true,
  showSocialCopy = false,
  interactive = false,
  eventTitle = "Event",
}: {
  attendees: FeedEvent["attendees"];
  acceptCount: number;
  variant?: AttendeeStackVariant;
  size?: "sm" | "md";
  showCount?: boolean;
  showSocialCopy?: boolean;
  interactive?: boolean;
  eventTitle?: string;
}) {
  const [listOpen, setListOpen] = useState(false);
  const avatarSize = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";
  const emptyTestId =
    variant === "passed" ? "pass-attendee-empty" : "attendee-empty";

  if (acceptCount === 0) {
    return (
      <p
        className="text-sm text-muted"
        data-testid={emptyTestId}
      >
        {emptyStateCopy(variant)}
      </p>
    );
  }

  const visible = attendees.slice(0, 4);
  const overflow = acceptCount - visible.length;
  const canOpenList = interactive && acceptCount > 0;

  function renderCaption() {
    if (showSocialCopy) {
      const names = attendees
        .map((attendee) => attendee.name?.trim())
        .filter((name): name is string => Boolean(name))
        .slice(0, 2);
      const remaining = acceptCount - names.length;

      if (names.length === 0) {
        return (
          <span className="text-sm text-foreground-secondary">
            {countLabel(variant, acceptCount)}
          </span>
        );
      }

      const namesLabel =
        names.length === 2 ? `${names[0]}, ${names[1]}` : names[0];

      if (remaining <= 0) {
        return (
          <span className="line-clamp-2 min-w-0 break-words text-sm font-semibold text-foreground">
            {namesLabel}
          </span>
        );
      }

      return (
        <p className="line-clamp-2 min-w-0 text-sm text-foreground-secondary">
          <span className="font-semibold text-foreground">{namesLabel}</span>
          {` and ${remaining} other${remaining === 1 ? "" : "s"}`}
        </p>
      );
    }

    if (showCount) {
      return (
        <span className="text-sm text-foreground-secondary">
          {countLabel(variant, acceptCount)}
        </span>
      );
    }

    return null;
  }

  const caption = renderCaption();
  const stackLayoutClass =
    "flex w-full min-w-0 flex-col gap-2 @min-[280px]:flex-row @min-[280px]:items-center @min-[280px]:gap-2.5";

  const content = (
    <div className={stackLayoutClass}>
      <div className="flex shrink-0 -space-x-2">
        {visible.map((attendee, index) => (
          <span
            key={attendee.id}
            className={`inline-flex ${avatarSize} items-center justify-center rounded-full border-2 border-surface font-semibold ${avatarClass(index)}`}
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
          <span
            className={`inline-flex ${avatarSize} items-center justify-center rounded-full border-2 border-surface bg-surface-muted text-[10px] font-semibold text-muted`}
          >
            +{overflow}
          </span>
        )}
      </div>
      {caption ? (
        <div className="min-w-0 flex-1 overflow-hidden">{caption}</div>
      ) : null}
    </div>
  );

  const stackTestId =
    variant === "passed" ? "pass-attendee-stack" : "attendee-stack";
  const stackButtonTestId =
    variant === "passed" ? "pass-attendee-stack-button" : "attendee-stack-button";

  return (
    <>
      {canOpenList ? (
        <button
          type="button"
          onClick={() => setListOpen(true)}
          className="block w-full min-w-0 rounded-lg text-left transition hover:opacity-90"
          aria-label={listAriaLabel(variant, eventTitle)}
          data-testid={stackButtonTestId}
        >
          {content}
        </button>
      ) : (
        <div className="min-w-0" data-testid={stackTestId}>
          {content}
        </div>
      )}

      <AttendeeListModal
        open={listOpen}
        onClose={() => setListOpen(false)}
        eventTitle={eventTitle}
        attendees={attendees}
        acceptCount={acceptCount}
        variant={variant}
      />
    </>
  );
}
