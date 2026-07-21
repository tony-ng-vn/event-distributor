/**
 * Shared client-side calendar sync loop.
 *
 * The server ingests one capped batch per POST (kept within the serverless time
 * budget). To pull a whole calendar we loop until the server reports nothing
 * remaining -- bounded requests, unbounded drain. Both the Settings page and the
 * front-page Sync button run this exact loop, so it lives here once.
 */

export type SyncOutcome = {
  status: "not-connected" | "fresh" | "synced";
  added?: number;
  skipped?: number;
  failed?: number;
  remaining?: number;
  skippedPast?: number;
  error?: string;
};

export type CalendarSyncSummary = {
  /** Total new events ingested across every pass. */
  added: number;
  /** Events dropped because they already ended (reported once by the server). */
  skippedPast: number;
  /** True when the pass cap was hit before the backlog fully drained. */
  reachedCap: boolean;
  /** Set only when the feed itself could not be fetched. */
  error?: string;
};

/** Safety cap: 30 passes x 20 events per batch. Far above any real calendar. */
const MAX_PASSES = 30;

function pastSuffix(skippedPast: number): string {
  if (skippedPast <= 0) return "";
  return ` Skipped ${skippedPast} past event${skippedPast === 1 ? "" : "s"}.`;
}

/** POST one sync batch to the API and unwrap its outcome. */
export async function postCalendarSync(force: boolean): Promise<SyncOutcome | undefined> {
  const response = await fetch("/api/calendar/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force }),
  });
  const data = (await response.json()) as { outcome?: SyncOutcome; error?: string };
  if (!response.ok) throw new Error(data.error ?? "Sync failed");
  return data.outcome;
}

/**
 * Drain the whole backlog, forcing a sync on every pass. `runSync` is injected
 * (defaults to the real POST) so the loop is testable without a network. Each
 * progress step is reported through `onStatus` for a live count.
 */
export async function drainCalendarSync(
  runSync: (force: boolean) => Promise<SyncOutcome | undefined> = postCalendarSync,
  onStatus: (message: string) => void = () => {},
): Promise<CalendarSyncSummary> {
  let added = 0;
  let skippedPast = 0;

  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const outcome = await runSync(true);

    if (outcome?.error) {
      onStatus(`Could not reach Luma: ${outcome.error}`);
      return { added, skippedPast, reachedCap: false, error: outcome.error };
    }

    added += outcome?.added ?? 0;
    // The past-event count is the same on every pass; capture it once.
    if (pass === 0) skippedPast = outcome?.skippedPast ?? 0;

    const remaining = outcome?.remaining ?? 0;
    if (remaining <= 0) {
      onStatus(
        added > 0
          ? `Done -- added ${added} event${added === 1 ? "" : "s"} to the feed.${pastSuffix(skippedPast)}`
          : `You're up to date -- no new upcoming events.${pastSuffix(skippedPast)}`,
      );
      return { added, skippedPast, reachedCap: false };
    }

    onStatus(`Syncing your calendar... ${added} added, ${remaining} to go.`);
  }

  onStatus(`Added ${added} events. Open the app again later to finish the rest.`);
  return { added, skippedPast, reachedCap: true };
}
