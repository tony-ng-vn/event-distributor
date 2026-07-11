/**
 * Subtle type label on feed cards — hidden while type_source is untyped.
 */
import {
  eventTypeLabel,
  type EventTypeId,
  type EventTypeSource,
} from "@/lib/event-type-taxonomy";

export function EventTypeLabel({
  primaryType,
  typeSource,
  className = "",
}: {
  primaryType: EventTypeId;
  typeSource: EventTypeSource;
  className?: string;
}) {
  if (typeSource === "untyped") return null;

  return (
    <span
      className={`tag-pill ${className}`.trim()}
      data-testid="event-type-label"
    >
      {eventTypeLabel(primaryType)}
    </span>
  );
}
