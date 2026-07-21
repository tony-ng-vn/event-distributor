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
import { useCalendarSync } from "@/hooks/useCalendarSync";

type Connection = { connected: boolean; syncedAt: string | null };

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
  const { syncing, status, sync, resetStatus } = useCalendarSync();

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

  async function connect() {
    if (!icalUrl.trim()) return;
    setBusy(true);
    setError(null);
    resetStatus();
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
      await sync();
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setError(null);
    resetStatus();
    try {
      await sync();
      await refreshConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    resetStatus();
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
              disabled={busy || syncing}
              aria-busy={syncing}
            >
              {syncing ? "Syncing..." : "Sync now"}
            </button>
            <button
              type="button"
              className="btn-secondary px-5 py-2.5"
              onClick={disconnect}
              disabled={busy || syncing}
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

      {status ? (
        <p className="mt-3 text-sm text-foreground" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
