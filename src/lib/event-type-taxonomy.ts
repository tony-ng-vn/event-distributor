/**
 * Closed event-type taxonomy for feed filters (PRD #46).
 *
 * primary_type is always one of these ids. type_source tracks how it was set:
 * untyped | model | rules | fallback | human.
 */
export const EVENT_TYPE_IDS = [
  "social",
  "builders",
  "talks",
  "sports",
  "arts",
  "other",
] as const;

export type EventTypeId = (typeof EVENT_TYPE_IDS)[number];

export const EVENT_TYPE_SOURCES = [
  "untyped",
  "model",
  "rules",
  "fallback",
  "human",
] as const;

export type EventTypeSource = (typeof EVENT_TYPE_SOURCES)[number];

/** Filter pills: all types, or one taxonomy id. */
export type EventTypeFilter = "all" | EventTypeId;

const LABELS: Record<EventTypeId, string> = {
  social: "Social",
  builders: "Builders / AI",
  talks: "Talks / learning",
  sports: "Sports / fitness",
  arts: "Arts / culture",
  other: "Other",
};

export function isEventTypeId(value: unknown): value is EventTypeId {
  return (
    typeof value === "string" &&
    (EVENT_TYPE_IDS as readonly string[]).includes(value)
  );
}

export function isEventTypeSource(value: unknown): value is EventTypeSource {
  return (
    typeof value === "string" &&
    (EVENT_TYPE_SOURCES as readonly string[]).includes(value)
  );
}

export function parseEventTypeId(value: unknown): EventTypeId | null {
  return isEventTypeId(value) ? value : null;
}

export function eventTypeLabel(id: EventTypeId): string {
  return LABELS[id];
}

/** Short chip label for filter pills. */
export function eventTypeFilterLabel(filter: EventTypeFilter): string {
  if (filter === "all") return "All types";
  return LABELS[filter];
}

/**
 * Other pill shows classified-as-other only — never in-flight untyped rows.
 */
export function matchesEventTypeFilter(
  primaryType: EventTypeId,
  typeSource: EventTypeSource,
  filter: EventTypeFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "other") {
    return primaryType === "other" && typeSource !== "untyped";
  }
  return primaryType === filter;
}

export function taxonomyPromptList(): string {
  return EVENT_TYPE_IDS.map((id) => `- ${id}: ${LABELS[id]}`).join("\n");
}
