/**
 * The seam the event mutation layer calls. Keeps ingest fast and crash-safe:
 *
 * - Delivery runs AFTER the response flushes via Next's after(), so the runtime
 *   keeps the function alive to finish sending instead of freezing a bare
 *   un-awaited promise (which would silently drop emails on serverless).
 * - Outside a request context (tests, scripts) after() throws; we fall back to a
 *   guarded fire-and-forget so callers behave the same everywhere.
 * - notifyEventIngested swallows every error, so a delivery failure can never
 *   fail the ingest that triggered it.
 */
import { after } from "next/server";
import { dispatchEventIngested } from "@/lib/notifications/dispatcher";
import type { EventIngestedIntent } from "@/lib/notifications/types";

export type IngestedEventForNotification = {
  id: string;
  title: string;
  startAt: string;
  isOnline: boolean;
  location: string | null;
  addedBy: { id: string; name: string | null } | null;
};

async function notifyEventIngested(
  event: IngestedEventForNotification,
): Promise<void> {
  try {
    const intent: EventIngestedIntent = {
      type: "event.ingested",
      eventId: event.id,
      title: event.title,
      startAt: event.startAt,
      isOnline: event.isOnline,
      location: event.location,
      actorUserId: event.addedBy?.id ?? null,
      addedByName: event.addedBy?.name ?? null,
    };
    await dispatchEventIngested(intent);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`[notifications] event.ingested dispatch failed: ${reason}`);
  }
}

/** Fire-and-forget entry point used by ingestLumaEvent. */
export function scheduleEventIngestedNotification(
  event: IngestedEventForNotification,
): void {
  const run = () => notifyEventIngested(event);
  try {
    after(run);
  } catch {
    void run();
  }
}
