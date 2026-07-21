/**
 * Unit tests for the shared calendar drain loop.
 *
 * drainCalendarSync runs the client-side "sync until nothing is left" loop that
 * both the Settings page and the front-page Sync button use. Each pass ingests a
 * capped server batch; the loop repeats until the server reports nothing
 * remaining. The batch call is injected so these tests need no network.
 */
import { describe, it, expect } from "vitest";
import { drainCalendarSync, type SyncOutcome } from "@/lib/calendar-sync";

function collect() {
  const statuses: string[] = [];
  return { statuses, onStatus: (m: string) => statuses.push(m) };
}

describe("drainCalendarSync", () => {
  it("adds up events across multiple passes until nothing remains", async () => {
    const passes: SyncOutcome[] = [
      { status: "synced", added: 20, remaining: 5, skippedPast: 3 },
      { status: "synced", added: 5, remaining: 0, skippedPast: 3 },
    ];
    let i = 0;
    const { statuses, onStatus } = collect();

    const summary = await drainCalendarSync(async () => passes[i++], onStatus);

    expect(summary).toEqual({ added: 25, skippedPast: 3, reachedCap: false });
    // Interim status announces progress; final status confirms completion.
    expect(statuses.at(-1)).toContain("added 25");
    expect(statuses.at(-1)).toContain("Skipped 3 past events");
  });

  it("reports an up-to-date result when the first pass adds nothing", async () => {
    const { statuses, onStatus } = collect();
    const summary = await drainCalendarSync(
      async () => ({ status: "synced", added: 0, remaining: 0 }),
      onStatus,
    );

    expect(summary).toEqual({ added: 0, skippedPast: 0, reachedCap: false });
    expect(statuses.at(-1)).toContain("up to date");
  });

  it("surfaces a feed-unreachable error and stops draining", async () => {
    let calls = 0;
    const { statuses, onStatus } = collect();
    const summary = await drainCalendarSync(async () => {
      calls += 1;
      return { status: "synced", error: "Luma feed returned 503" };
    }, onStatus);

    expect(calls).toBe(1); // stops immediately, does not loop
    expect(summary.error).toBe("Luma feed returned 503");
    expect(statuses.at(-1)).toContain("Could not reach Luma");
  });

  it("stops after the pass cap and flags reachedCap when a feed never drains", async () => {
    let calls = 0;
    const { onStatus } = collect();
    // Server always reports one more remaining -> loop would never end on its own.
    const summary = await drainCalendarSync(async () => {
      calls += 1;
      return { status: "synced", added: 1, remaining: 10 };
    }, onStatus);

    expect(summary.reachedCap).toBe(true);
    expect(calls).toBeLessThanOrEqual(30);
    expect(summary.added).toBe(calls);
  });
});
