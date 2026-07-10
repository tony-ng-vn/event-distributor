/**
 * Calendar section of the settings page: connect a Luma iCal subscription so
 * events you RSVP to on Luma flow into the shared feed automatically.
 *
 * Reads/writes /api/calendar and /api/calendar/sync. Handles the signed-out
 * case itself (clerkMiddleware does not auto-protect the route).
 */
"use client";

import { useEffect, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";

type Connection = { connected: boolean; syncedAt: string | null };

type SyncOutcome = {
  status: "not-connected" | "fresh" | "synced";
  added?: number;
  skipped?: number;
  failed?: number;
  remaining?: number;
  skippedPast?: number;
  error?: string;
};

function formatSynced(syncedAt: string | null): string {
  if (!syncedAt) return "not yet";
  const ms = Date.parse(syncedAt);
  if (Number.isNaN(ms)) return "not yet";
  return new Date(ms).toLocaleString();
}

export function CalendarSyncSettings() {
  const { isLoaded, isSignedIn } = useUser();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [icalUrl, setIcalUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/calendar");
        const data = (await response.json()) as { connection?: Connection };
        if (!response.ok) throw new Error("Could not load your calendar");
        if (!cancelled && data.connection) setConnection(data.connection);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load calendar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  async function runSync(force: boolean) {
    const response = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force }),
    });
    const data = (await response.json()) as { outcome?: SyncOutcome; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Sync failed");
    return data.outcome;
  }

  // Drain the whole backlog. Each call ingests a capped batch (the server keeps
  // one request within the serverless time budget); we loop until nothing is
  // left, showing a live count. Bounded requests, unbounded drain.
  async function drainSync() {
    let total = 0;
    let pastSkipped = 0;
    // Safety cap: 30 passes x 20 events. Far above any real calendar.
    for (let pass = 0; pass < 30; pass += 1) {
      const outcome = await runSync(true);
      if (outcome?.error) {
        setNotice(`Could not reach Luma: ${outcome.error}`);
        return;
      }
      total += outcome?.added ?? 0;
      // Past-event count is the same on every pass; capture it once.
      if (pass === 0) pastSkipped = outcome?.skippedPast ?? 0;
      const remaining = outcome?.remaining ?? 0;
      if (remaining <= 0) {
        const past =
          pastSkipped > 0 ? ` Skipped ${pastSkipped} past event${pastSkipped === 1 ? "" : "s"}.` : "";
        setNotice(
          total > 0
            ? `Done -- added ${total} event${total === 1 ? "" : "s"} to the feed.${past}`
            : `You're up to date -- no new upcoming events.${past}`,
        );
        return;
      }
      setNotice(`Syncing your calendar... ${total} added, ${remaining} to go.`);
    }
    setNotice(`Added ${total} events. Open the app again later to finish the rest.`);
  }

  async function connect() {
    if (!icalUrl.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl }),
      });
      const data = (await response.json()) as { connection?: Connection; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not connect");
      if (data.connection) setConnection(data.connection);
      setIcalUrl("");

      // Pull the whole calendar so the member sees everything, not just batch 1.
      await drainSync();
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await drainSync();
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/calendar", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not disconnect");
      setConnection({ connected: false, syncedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }

  async function refreshConnection() {
    const response = await fetch("/api/calendar");
    const data = (await response.json()) as { connection?: Connection };
    if (response.ok && data.connection) setConnection(data.connection);
  }

  if (!isLoaded || loading) {
    return (
      <div className="glass-card rounded-2xl p-6" data-testid="calendar-settings">
        <p className="text-sm text-muted">Loading calendar settings...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="glass-card rounded-2xl p-6" data-testid="calendar-settings">
        <h2 className="text-lg font-semibold text-foreground">Luma calendar</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in to connect your Luma calendar.
        </p>
        <div className="mt-4">
          <SignInButton mode="modal">
            <button type="button" className="btn-primary px-6 py-2.5">
              Sign in
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6" data-testid="calendar-settings">
      <h2 className="text-lg font-semibold text-foreground">Luma calendar</h2>
      <p className="mt-2 text-sm text-muted">
        Connect your Luma calendar and every event you RSVP to shows up in the
        shared feed automatically -- no pasting links.
      </p>

      {connection?.connected ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-foreground">
            Connected. Last synced: {formatSynced(connection.syncedAt)}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn-primary px-5 py-2.5"
              onClick={syncNow}
              disabled={busy}
            >
              {busy ? "Syncing..." : "Sync now"}
            </button>
            <button
              type="button"
              className="btn-secondary px-5 py-2.5"
              onClick={disconnect}
              disabled={busy}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>In Luma, open Settings, then Calendar Syncing.</li>
            <li>Tap Add iCal Subscription and copy the link.</li>
            <li>Paste it below and connect.</li>
          </ol>
          <input
            type="url"
            inputMode="url"
            value={icalUrl}
            onChange={(event) => setIcalUrl(event.target.value)}
            placeholder="webcal://lu.ma/... or https://lu.ma/..."
            className="w-full rounded-xl border border-black/10 bg-white/60 px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground/40"
          />
          <button
            type="button"
            className="btn-primary px-5 py-2.5"
            onClick={connect}
            disabled={busy || !icalUrl.trim()}
          >
            {busy ? "Connecting..." : "Connect calendar"}
          </button>
        </div>
      )}

      {notice ? <p className="mt-3 text-sm text-foreground">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
