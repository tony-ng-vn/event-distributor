/**
 * Modal to paste an event URL — Preview fetches metadata, Add saves to feed.
 *
 * Two-step API: POST /api/events/ingest with preview:true, then without preview.
 */
"use client";

import { useState } from "react";
import type { FeedEvent } from "@/types/feed";

export function IngestModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (event: FeedEvent) => void;
}) {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<FeedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handlePreview() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/events/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lumaUrl: url, preview: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Preview failed");
      setPreview({
        id: "preview",
        lumaUrl: url,
        title: data.preview.title,
        description: data.preview.description,
        coverImageUrl: data.preview.coverImageUrl,
        startAt: new Date(data.preview.startAt).toISOString(),
        endAt: new Date(data.preview.endAt).toISOString(),
        location: data.preview.location,
        isOnline: data.preview.isOnline,
        meetingUrl: data.preview.meetingUrl,
        hostName: data.preview.hostName,
        hostAvatarUrl: null,
        createdAt: new Date().toISOString(),
        acceptCount: 0,
        attendees: [],
        passCount: 0,
        passAttendees: [],
        viewerAccepted: false,
        viewerPassed: false,
        addedBy: null,
      });
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/events/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lumaUrl: url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not add event");
      onAdded(data.event);
      setUrl("");
      setPreview(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add event");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="glass-card w-full max-w-lg rounded-2xl p-6"
        data-testid="ingest-modal"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Share an event</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-muted hover:bg-white/50"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-sm text-muted">
          Paste an event link (Luma or any URL). Luma links get the richest
          preview with date and location when available.
        </p>

        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setPreview(null);
            setError(null);
          }}
          placeholder="https://lu.ma/your-event or any event page"
          className="input-field"
          data-testid="luma-url-input"
        />

        {error && (
          <p className="mt-3 text-sm text-red-600" data-testid="ingest-error">
            {error}
          </p>
        )}

        {preview && (
          <div className="mt-4 rounded-xl border border-white/50 bg-white/40 p-4 backdrop-blur">
            <p className="font-medium text-foreground">{preview.title}</p>
            <p className="mt-1 text-sm text-muted">
              {preview.location || (preview.isOnline ? "Online" : "Location TBD")}
            </p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!url || loading}
            className="btn-secondary flex-1 py-3 disabled:opacity-50"
            data-testid="preview-button"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!url || loading}
            className="btn-primary flex-1 py-3 disabled:opacity-50"
            data-testid="add-event-button"
          >
            Add to feed
          </button>
        </div>
      </div>
    </div>
  );
}
