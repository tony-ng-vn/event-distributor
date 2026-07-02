/**
 * Side-by-side "Who's interested" and "Who passed" strips for event cards.
 */
"use client";

import { AttendeeStack } from "@/components/AttendeeStack";
import type { FeedEvent } from "@/types/feed";

export function EventAttendeeSections({
  event,
  interactive = false,
  showSocialCopy = true,
  showCount = false,
  className = "",
}: {
  event: FeedEvent;
  interactive?: boolean;
  showSocialCopy?: boolean;
  showCount?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="going-strip">
        <div className="grid grid-cols-1 gap-y-4 @min-[480px]:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] @min-[480px]:gap-x-5">
          <div className="@container min-w-0">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
              Who&apos;s interested
            </p>
            <AttendeeStack
              variant="interested"
              attendees={event.attendees}
              acceptCount={event.acceptCount}
              showSocialCopy={showSocialCopy}
              showCount={showCount}
              interactive={interactive}
              eventTitle={event.title}
            />
          </div>
          <div className="@container min-w-0">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">
              Who passed
            </p>
            <AttendeeStack
              variant="passed"
              attendees={event.passAttendees}
              acceptCount={event.passCount}
              showSocialCopy={showSocialCopy}
              showCount={showCount}
              interactive={interactive}
              eventTitle={event.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
