/**
 * Modal to edit the display name friends see on event cards.
 */
"use client";

import { useEffect, useState } from "react";

export function EditDisplayNameModal({
  open,
  initialName,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as { error?: string; name?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not save name");
        return;
      }

      onSaved(data.name ?? name.trim());
      onClose();
    } catch {
      setError("Could not save name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="glass-card w-full max-w-md rounded-2xl p-6"
        data-testid="edit-name-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-name-title"
      >
        <h2 id="edit-name-title" className="text-lg font-semibold text-foreground">
          Edit display name
        </h2>
        <p className="mt-2 text-sm text-muted">
          This is the name friends see when you mark events as interested.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="display-name" className="text-sm font-medium text-foreground">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-foreground/30"
              data-testid="edit-name-input"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" data-testid="edit-name-error">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 py-3"
              disabled={saving}
              data-testid="edit-name-save"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
