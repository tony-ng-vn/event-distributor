/**
 * "Interested" click policy, kept out of React so it stays unit-testable.
 *
 * Product decision (confirmed with the maintainer): clicking Interested still
 * records interest exactly like the old Accept did -- that is what powers the
 * "Your events" tab and the "Who's going" strip. Only after that recording
 * succeeds do we open the event's own source page in a new tab so the user can
 * finish real sign-up/RSVP. A failed accept must never navigate.
 */
import { resolveEventHref } from "@/lib/event-page";

/** Just the fields the Interested flow needs, so it stays easy to test. */
type EventSource = { lumaUrl: string | null | undefined };
type EventTarget = EventSource & { id: string };

type WindowOpen = (
  url: string,
  target: string,
  features: string,
) => Window | null;

/**
 * Open an event's source page in a new tab. No-op when the stored URL is
 * missing or unsafe (resolveEventHref returns null), so a broken link never
 * pops a blank tab. noopener,noreferrer keeps the external page from touching
 * this one.
 */
export function openEventPage(
  event: EventSource,
  open: WindowOpen = (url, target, features) => window.open(url, target, features),
): void {
  const href = resolveEventHref(event.lumaUrl);
  if (!href) return;
  open(href, "_blank", "noopener,noreferrer");
}

/**
 * Record interest via `accept`, then open the event page only when the accept
 * actually succeeded. Returns whether interest was recorded.
 */
export async function runInterested(
  event: EventTarget,
  deps: {
    accept: (eventId: string) => Promise<boolean>;
    openEventPage?: (event: EventSource) => void;
  },
): Promise<boolean> {
  const recorded = await deps.accept(event.id);
  if (recorded) {
    (deps.openEventPage ?? openEventPage)(event);
  }
  return recorded;
}
