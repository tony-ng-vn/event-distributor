/**
 * Settings entry point to the waitlist, shown only to admins.
 *
 * Renders nothing until the waitlist API confirms the viewer is an admin (200);
 * a non-admin gets 403 and never sees the link, so the feature stays hidden.
 */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminWaitlistLink() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/waitlist", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setPendingCount((data.users ?? []).length);
      } catch {
        // Not an admin, or transient error: leave the link hidden.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (pendingCount === null) return null;

  return (
    <Link
      href="/admin/waitlist"
      className="glass-card mt-4 flex items-center justify-between gap-4 rounded-2xl p-4"
    >
      <div>
        <p className="font-medium text-foreground">Waitlist</p>
        <p className="text-sm text-muted">
          {pendingCount === 0
            ? "No one waiting"
            : `${pendingCount} waiting for approval`}
        </p>
      </div>
      <span className="btn-secondary whitespace-nowrap">Review</span>
    </Link>
  );
}
