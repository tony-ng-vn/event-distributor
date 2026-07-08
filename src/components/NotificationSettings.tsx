/**
 * Notifications section of the settings page: toggle new-event emails on/off.
 * Reads and writes /api/me/notification-preferences. Handles the signed-out case
 * itself (clerkMiddleware does not auto-protect the route).
 */
"use client";

import { useEffect, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";

type PreferenceResponse = {
  preference?: { emailEnabled: boolean; hasResponded: boolean };
};

export function NotificationSettings() {
  const { isLoaded, isSignedIn } = useUser();
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/me/notification-preferences");
        const data = (await response.json()) as PreferenceResponse;
        if (!response.ok) throw new Error("Could not load your preferences");
        if (!cancelled && data.preference) {
          setEmailEnabled(data.preference.emailEnabled);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load preferences");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    const previous = emailEnabled;
    setEmailEnabled(next);
    try {
      const response = await fetch("/api/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled: next }),
      });
      if (!response.ok) throw new Error("Could not save your preference");
    } catch (err) {
      setEmailEnabled(previous);
      setError(err instanceof Error ? err.message : "Could not save preference");
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="glass-card rounded-2xl p-6" data-testid="notif-settings">
        <p className="text-sm text-muted">Loading notification settings...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="glass-card rounded-2xl p-6" data-testid="notif-settings">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <p className="mt-2 text-sm text-muted">
          Sign in to manage your email notifications.
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
    <div className="glass-card rounded-2xl p-6" data-testid="notif-settings">
      <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Email me when a new event is added
          </p>
          <p className="mt-1 text-sm text-muted">
            A short email whenever someone shares a new event with the group.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailEnabled}
          aria-label="Email me when a new event is added"
          disabled={saving}
          onClick={() => toggle(!emailEnabled)}
          data-testid="notif-email-toggle"
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            emailEnabled ? "bg-foreground" : "bg-black/20"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              emailEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600" data-testid="notif-settings-error">
          {error}
        </p>
      )}
    </div>
  );
}
