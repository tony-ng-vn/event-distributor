/**
 * Modal for submitting quick in-app feedback.
 */
"use client";

import { useEffect, useState } from "react";

const MAX_MESSAGE_LENGTH = 2000;

export function FeedbackModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setError(null);
    setLoading(false);
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send feedback");
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback");
    } finally {
      setLoading(false);
    }
  }

  const remaining = MAX_MESSAGE_LENGTH - message.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="glass-card w-full max-w-lg rounded-2xl p-6"
        data-testid="feedback-modal"
        role="dialog"
        aria-labelledby="feedback-modal-title"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="feedback-modal-title"
            className="text-lg font-semibold text-foreground"
          >
            Send feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted hover:bg-white/50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-muted">
          Share a bug, idea, or anything that would make this app better for your
          group.
        </p>

        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
            setError(null);
          }}
          placeholder="What's on your mind?"
          rows={5}
          className="textarea-field"
          data-testid="feedback-message-input"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {remaining} character{remaining === 1 ? "" : "s"} left
          </p>
          {error && (
            <p className="text-sm text-red-600" data-testid="feedback-error">
              {error}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1 py-3 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim() || loading}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
            data-testid="feedback-submit-button"
          >
            {loading ? "Sending..." : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
