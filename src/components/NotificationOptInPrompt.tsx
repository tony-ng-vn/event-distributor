/**
 * Gentle, skippable opt-in prompt for new-event emails.
 *
 * Mounted top-level (app layout), NOT inside the feed tabs. Shows once per user:
 * whenever a signed-in user has not yet answered (no row or has_responded=false).
 * "Turn on email" enables email; "Not now"/dismiss records the answer so we never nag
 * again. All persistence is server-side via /api/me/notification-preferences.
 */
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type PreferenceResponse = {
  preference?: { emailEnabled: boolean; hasResponded: boolean };
};

export function NotificationOptInPrompt() {
  const { isLoaded, isSignedIn } = useUser();
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setVisible(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/me/notification-preferences");
        if (!response.ok) return;
        const data = (await response.json()) as PreferenceResponse;
        if (!cancelled && data.preference && !data.preference.hasResponded) {
          setVisible(true);
        }
      } catch {
        // Non-critical: if we cannot read prefs, just do not prompt.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  async function respond(emailEnabled: boolean) {
    setSaving(true);
    try {
      await fetch("/api/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEnabled, hasResponded: true }),
      });
    } catch {
      // Even if the save fails, hide the prompt so we do not trap the user.
    } finally {
      setSaving(false);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4">
      <div
        className="glass-card w-full max-w-md rounded-2xl p-5 shadow-lg"
        role="dialog"
        aria-labelledby="notif-optin-title"
        data-testid="notif-optin-prompt"
      >
        <h2
          id="notif-optin-title"
          className="text-base font-semibold text-foreground"
        >
          Get an email when a new event is added?
        </h2>
        <p className="mt-1 text-sm text-muted">
          Turn it on below to get one email whenever a friend adds a new event.
          You can change this anytime in Settings.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={saving}
            className="btn-secondary flex-1 py-2.5 disabled:opacity-50"
            data-testid="notif-optin-decline"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            disabled={saving}
            className="btn-primary flex-1 py-2.5 disabled:opacity-50"
            data-testid="notif-optin-accept"
          >
            {saving ? "Saving..." : "Turn on email"}
          </button>
        </div>
      </div>
    </div>
  );
}
