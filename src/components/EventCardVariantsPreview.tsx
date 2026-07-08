/**
 * Dev-only preview: three Remove interest placements side by side.
 */
"use client";

import { EventFeedCard } from "@/components/EventFeedCard";
import {
  REMOVE_INTEREST_LAYOUT_LABELS,
  REMOVE_INTEREST_LAYOUTS,
} from "@/lib/event-card-ui";
import type { FeedEvent } from "@/types/feed";

const MOCK_EVENT: FeedEvent = {
  id: "preview-chai-night",
  lumaUrl: "https://lu.ma/chai-night",
  title: "Chai Night",
  description: "Cozy evening with chai and vintage keyboards.",
  coverImageUrl:
    "https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=400/event-covers/1/ai-meetup.jpg",
  startAt: "2026-07-09T19:00:00.000Z",
  endAt: "2026-07-09T21:00:00.000Z",
  location: "San Francisco, CA",
  isOnline: false,
  meetingUrl: null,
  hostName: null,
  hostAvatarUrl: null,
  createdAt: "2026-07-01T12:00:00.000Z",
  acceptCount: 2,
  attendees: [
    { id: "u1", name: "Tony Nguyen", image: null },
    { id: "u2", name: "James Ding", image: null },
  ],
  passCount: 0,
  passAttendees: [],
  viewerAccepted: true,
  viewerPassed: false,
  addedBy: null,
};

export function EventCardVariantsPreview() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Event card UI variants
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Title links open Luma in a new tab (hover the title to see the cue).
          Compare three placements for Remove interest — pick one and we can
          wire it as the default.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {REMOVE_INTEREST_LAYOUTS.map((layout) => (
          <section key={layout} className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {REMOVE_INTEREST_LAYOUT_LABELS[layout]}
              </p>
              <p className="mt-1 text-xs text-muted">
                {layout === "stacked" &&
                  "Current layout — clear but adds another full-width pill."}
                {layout === "inline-badge" &&
                  "Compact — action lives inside the green status badge."}
                {layout === "text-link" &&
                  "Lightweight — text link under the badge, less visual weight."}
              </p>
            </div>
            <EventFeedCard
              event={MOCK_EVENT}
              status="accepted"
              removeInterestLayout={layout}
              onAccept={() => undefined}
              onPass={() => undefined}
              onUnaccept={() => undefined}
              onOpen={() => undefined}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
