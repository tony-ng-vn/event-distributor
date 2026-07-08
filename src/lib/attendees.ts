/**
 * Attendee display helpers (avatar initials, colors, dedup).
 *
 * Pure functions -- no React, no database. Used by AttendeeStack and FeedSummary.
 */

/** Rotating neutral tones so adjacent avatar circles stay distinguishable. */
const AVATAR_CLASSES = [
  "bg-neutral-200 text-neutral-600",
  "bg-neutral-300 text-neutral-700",
  "bg-neutral-400 text-neutral-800",
] as const;

export function avatarClass(index: number): string {
  return AVATAR_CLASSES[index % AVATAR_CLASSES.length];
}

/** "Maya Kim" -> "MK" for avatar circles when there is no profile photo. */
export function getAttendeeInitials(name: string | null): string {
  if (!name?.trim()) return "?";

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
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
