/**
 * Overlapping avatar circles + optional "7 going" or "Maya, Jordan and 5 others" text.
 *
 * Used inside EventFeedCard (showSocialCopy) and EventDetailSheet (showCount default).
 */
"use client";

import { getAttendeeInitials } from "@/lib/attendees";
import type { FeedEvent } from "@/types/feed";

const AVATAR_CLASSES = [
  "bg-neutral-200 text-neutral-600",
  "bg-neutral-300 text-neutral-700",
  "bg-neutral-400 text-neutral-800",
] as const;

function avatarClass(index: number): string {
  return AVATAR_CLASSES[index % AVATAR_CLASSES.length];
}

export function AttendeeStack({
  attendees,
  acceptCount,
  size = "md",
  showCount = true,
  showSocialCopy = false,
}: {
  attendees: FeedEvent["attendees"];
  acceptCount: number;
  size?: "sm" | "md";
  showCount?: boolean;
  showSocialCopy?: boolean;
}) {
  const avatarSize = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";

  if (acceptCount === 0) {
    return (
      <p className="text-sm text-muted" data-testid="attendee-empty">
        Be the first to say you&apos;re in
      </p>
    );
  }

  const visible = attendees.slice(0, 4);
  const overflow = acceptCount - visible.length;

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
            {acceptCount} interested
          </span>
        );
      }

      const namesLabel =
        names.length === 2 ? `${names[0]}, ${names[1]}` : names[0];

      if (remaining <= 0) {
        return (
          <span className="text-sm font-semibold text-foreground">
            {namesLabel}
          </span>
        );
      }

      return (
        <p className="text-sm text-foreground-secondary">
          <span className="font-semibold text-foreground">{namesLabel}</span>
          {` and ${remaining} other${remaining === 1 ? "" : "s"}`}
        </p>
      );
    }

    if (showCount) {
      return (
        <span className="text-sm text-foreground-secondary">
          {acceptCount} interested
        </span>
      );
    }

    return null;
  }

  return (
    <div className="flex items-center gap-2.5" data-testid="attendee-stack">
      <div className="flex -space-x-2">
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
          <span className={`inline-flex ${avatarSize} items-center justify-center rounded-full border-2 border-surface bg-surface-muted text-[10px] font-semibold text-muted`}>
            +{overflow}
          </span>
        )}
      </div>
      {renderCaption()}
    </div>
  );
}
