/**
 * Fire-and-forget event type classification after ingest.
 * Mirrors notifications/notify.ts: after() keeps serverless alive; never fails ingest.
 */
import { after } from "next/server";
import { classifyAndPersistEvent } from "@/lib/event-type-classifier";

async function runClassify(eventId: string): Promise<void> {
  try {
    await classifyAndPersistEvent(eventId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`[event-type] classify failed for ${eventId}: ${reason}`);
  }
}

/** Schedule classification after a successful event insert. */
export function scheduleEventTypeClassification(eventId: string): void {
  const run = () => runClassify(eventId);
  try {
    after(run);
  } catch {
    void run();
  }
}
