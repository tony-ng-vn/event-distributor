/**
 * Square event cover thumbnail shared by the feed card and the your-events list.
 * Falls back to a "No image" placeholder when the event has no cover.
 *
 * alt is empty on purpose: the thumbnail is decorative next to the event title,
 * so a text alt would just double-announce the name to screen readers.
 */
import type { FeedEvent } from "@/types/feed";

export function EventThumbnail({
  event,
  className = "",
}: {
  event: Pick<FeedEvent, "coverImageUrl">;
  className?: string;
}) {
  return (
    <div
      className={`h-[72px] w-[72px] overflow-hidden rounded-xl bg-surface-muted lg:h-20 lg:w-20 ${className}`.trim()}
      data-testid="event-thumbnail"
    >
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
  );
}
