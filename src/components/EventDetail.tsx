"use client";

import { useState } from "react";
import type { Event } from "@/types/event";
import { DISTRIBUTION_CHANNELS } from "@/types/event";
import { formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { DistributionModal } from "@/components/DistributionModal";

interface EventDetailProps {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  onSchedule: () => void;
  onDistribute: (channels: Event["channels"]) => void;
  onClose: () => void;
}

export function EventDetail({
  event,
  onEdit,
  onDelete,
  onSchedule,
  onDistribute,
  onClose,
}: EventDetailProps) {
  const [showDistribute, setShowDistribute] = useState(false);

  const channelLabels = event.channels
    .map((c) => DISTRIBUTION_CHANNELS.find((ch) => ch.id === c)?.label ?? c)
    .join(", ");

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-900">
                {event.title}
              </h2>
              <StatusBadge status={event.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {formatDateTime(event.startDate)} – {formatDateTime(event.endDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
          {event.location && (
            <DetailBlock label="Location" value={event.location} />
          )}

          {event.description && (
            <DetailBlock label="Description" value={event.description} multiline />
          )}

          <DetailBlock
            label="Recipients"
            value={
              event.recipients.length > 0
                ? event.recipients.join(", ")
                : "No recipients assigned"
            }
          />

          <DetailBlock
            label="Channels"
            value={channelLabels || "None selected"}
          />

          {event.distributedAt && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-800">
                Distributed successfully
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Sent on {formatDateTime(event.distributedAt)} via {channelLabels}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-zinc-100 px-4 py-3 sm:px-5">
          {event.status !== "distributed" && (
            <button
              type="button"
              onClick={() => setShowDistribute(true)}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              Distribute Event
            </button>
          )}

          {event.status === "draft" && (
            <button
              type="button"
              onClick={onSchedule}
              className="w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
            >
              Mark as Scheduled
            </button>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showDistribute && (
        <DistributionModal
          event={event}
          onClose={() => setShowDistribute(false)}
          onConfirm={(channels) => {
            onDistribute(channels);
            setShowDistribute(false);
          }}
        />
      )}
    </>
  );
}

function DetailBlock({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-1 text-sm text-zinc-800 ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
