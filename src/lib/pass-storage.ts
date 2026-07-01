/**
 * Anonymous "Pass" storage (sessionStorage).
 *
 * Signed-in users persist passes server-side via POST /api/events/[id]/pass.
 * Anonymous users hide events locally until the browser tab closes.
 *
 * Used by: FeedApp (filter visible events when not signed in)
 */
const STORAGE_KEY = "event-distributor-passed";

export function getPassedEventIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function passEvent(eventId: string): void {
  const ids = new Set(getPassedEventIds());
  ids.add(eventId);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function unpassEvent(eventId: string): void {
  const ids = getPassedEventIds().filter((id) => id !== eventId);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function clearPassedEvents(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
