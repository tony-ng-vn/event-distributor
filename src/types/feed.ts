/**
 * Shared TypeScript types for the feed UI.
 *
 * FeedEvent mirrors what /api/events returns (see events-service.ts serializeEvent).
 * FeedFilter and MobileTab control FeedApp tabs and filter pills.
 */

/** One event card in the feed — dates are ISO strings for JSON transport. */
export type FeedEvent = {
  id: string;
  lumaUrl: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean;
  meetingUrl: string | null;
  hostName: string | null;
  hostAvatarUrl: string | null;
  createdAt: string;
  acceptCount: number;
  attendees: {
    id: string;
    name: string | null;
    image: string | null;
  }[];
  /** True when the signed-in viewer has clicked Accept on this event. */
  viewerAccepted: boolean;
  /** True when the signed-in viewer has passed on this event. */
  viewerPassed: boolean;
  /** User who ingested the event into the shared feed, if known. */
  addedBy: {
    id: string;
    name: string | null;
    image: string | null;
    email: string | null;
  } | null;
};

/** Filter pills above the feed: all | pending | accepted */
export type FeedFilter = "all" | "pending" | "accepted";

/** Bottom nav on mobile: Feed | Admin | Calendar | My Events */
export type MobileTab = "feed" | "admin" | "calendar" | "mine";
