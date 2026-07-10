/**
 * Admin waitlist review: list everyone still pending and approve them one tap.
 *
 * Self-guarding: a non-admin viewer gets a 403 from the API and sees a "not
 * authorized" note instead of the list. Approving re-reads nothing -- the row
 * is removed from local state on a successful write, which is the source of truth.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

type WaitlistUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
};

type LoadState = "loading" | "ready" | "forbidden" | "error";

function formatWaitedSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function WaitlistAdmin() {
  const [users, setUsers] = useState<WaitlistUser[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  // Remove is a hard delete, so it arms a confirm on the first tap and only
  // fires on the second. confirmingId holds the single armed row.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/admin/waitlist", { cache: "no-store" });
      if (response.status === 403) {
        setState("forbidden");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load waitlist");
      setUsers(data.users as WaitlistUser[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // A stray first tap should not leave a live delete armed on the row.
  useEffect(() => {
    if (!confirmingId) return;
    const timer = setTimeout(() => setConfirmingId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmingId]);

  async function approve(user: WaitlistUser) {
    setConfirmingId(null);
    setApprovingId(user.id);
    try {
      const response = await fetch("/api/admin/waitlist/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Approval failed");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setToast(`${user.name ?? user.email} is in`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setApprovingId(null);
    }
  }

  async function remove(user: WaitlistUser) {
    // First tap arms the confirm (replacing any other row's), second tap fires.
    if (confirmingId !== user.id) {
      setConfirmingId(user.id);
      return;
    }

    setConfirmingId(null);
    setRemovingId(user.id);
    try {
      const response = await fetch("/api/admin/waitlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Removal failed");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setToast(`${user.name ?? user.email} removed`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Removal failed");
    } finally {
      setRemovingId(null);
    }
  }

  if (state === "loading") {
    return <p className="text-sm text-muted">Loading waitlist...</p>;
  }

  if (state === "forbidden") {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="font-medium text-foreground">Not authorized</p>
        <p className="mt-2 text-sm text-muted">
          Only admins can review the waitlist.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="font-medium text-foreground">Could not load the waitlist</p>
        <button type="button" onClick={() => void load()} className="btn-secondary mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {users.length === 0
          ? "No one is waiting right now."
          : `${users.length} ${users.length === 1 ? "person" : "people"} waiting`}
      </p>

      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="glass-card flex items-center justify-between gap-4 rounded-2xl p-4"
            data-testid="waitlist-row"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {user.name ?? user.email}
              </p>
              <p className="truncate text-sm text-muted">
                {user.email}
                {formatWaitedSince(user.createdAt)
                  ? ` -- since ${formatWaitedSince(user.createdAt)}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void remove(user)}
                disabled={removingId === user.id}
                className="btn-delete whitespace-nowrap disabled:opacity-60"
                data-testid="waitlist-remove"
              >
                {removingId === user.id
                  ? "Removing..."
                  : confirmingId === user.id
                    ? "Confirm remove?"
                    : "Remove"}
              </button>
              <button
                type="button"
                onClick={() => void approve(user)}
                disabled={approvingId === user.id}
                className="btn-primary whitespace-nowrap disabled:opacity-60"
              >
                {approvingId === user.id ? "Approving..." : "Approve"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
