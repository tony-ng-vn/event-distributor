/**
 * Attendee display helpers (avatars + "Maya, Jordan and 5 others" copy).
 *
 * Pure functions — no React, no database. Used by AttendeeStack and FeedSummary.
 */
type NamedAttendee = {
  name: string | null;
};

/** "Maya Kim" → "MK" for avatar circles when there is no profile photo. */
export function getAttendeeInitials(name: string | null): string {
  if (!name?.trim()) return "?";

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

/** Builds human-readable social proof text for the "who's going" row. */
export function formatAttendeeSummary(
  attendees: NamedAttendee[],
  acceptCount: number,
): string {
  if (acceptCount === 0) return "Be the first to say you're in";

  const names = attendees
    .map((attendee) => attendee.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 2);

  const remaining = acceptCount - names.length;

  if (names.length === 0) return `${acceptCount} interested`;
  if (remaining <= 0) {
    return names.length === 1 ? names[0] : `${names[0]} and ${names[1]}`;
  }
  if (names.length === 1) {
    return `${names[0]} and ${remaining} other${remaining === 1 ? "" : "s"}`;
  }

  return `${names[0]}, ${names[1]} and ${remaining} other${remaining === 1 ? "" : "s"}`;
}

/** Deduplicate people across multiple events for the feed summary bar. */
export function collectUniqueAttendees(
  events: { attendees: { id: string; name: string | null; image: string | null }[] }[],
): { id: string; name: string | null; image: string | null }[] {
  const seen = new Set<string>();
  const unique: { id: string; name: string | null; image: string | null }[] = [];

  for (const event of events) {
    for (const attendee of event.attendees) {
      if (seen.has(attendee.id)) continue;
      seen.add(attendee.id);
      unique.push(attendee);
    }
  }

  return unique;
}
