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
}: {
  event: FeedEvent;
  interactive?: boolean;
  showSocialCopy?: boolean;
  showCount?: boolean;
}) {
  return (
    <div className="going-strip">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
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
        <div>
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
  );
}
