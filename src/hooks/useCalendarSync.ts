/**
 * React wrapper around the shared calendar drain loop (see calendar-sync.ts).
 *
 * Owns the transient "syncing" flag and the live status message so any surface
 * -- the Settings page, the front-page Sync button -- can trigger a force sync
 * with one call and render consistent progress text.
 */
"use client";

import { useCallback, useState } from "react";
import {
  drainCalendarSync,
  type CalendarSyncSummary,
} from "@/lib/calendar-sync";

export function useCalendarSync() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sync = useCallback(async (): Promise<CalendarSyncSummary> => {
    setSyncing(true);
    try {
      return await drainCalendarSync(undefined, setStatus);
    } finally {
      setSyncing(false);
    }
  }, []);

  const resetStatus = useCallback(() => setStatus(null), []);

  return { syncing, status, sync, resetStatus };
}
