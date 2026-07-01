"use client";

import { useState } from "react";
import type { DistributionChannel, Event } from "@/types/event";
import { DISTRIBUTION_CHANNELS } from "@/types/event";

interface DistributionModalProps {
  event: Event;
  onClose: () => void;
  onConfirm: (channels: DistributionChannel[]) => void;
}

export function DistributionModal({
  event,
  onClose,
  onConfirm,
}: DistributionModalProps) {
  const [channels, setChannels] = useState<DistributionChannel[]>(
    event.channels.length > 0 ? event.channels : ["email"],
  );
  const [distributing, setDistributing] = useState(false);
  const [done, setDone] = useState(false);

  const toggleChannel = (channel: DistributionChannel) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  };

  const handleDistribute = async () => {
    if (channels.length === 0) return;

    setDistributing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setDistributing(false);
    setDone(true);

    await new Promise((resolve) => setTimeout(resolve, 600));
    onConfirm(channels);
  };

  const recipientCount = event.recipients.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribute-title"
      >
        <div className="border-b border-zinc-100 px-5 py-4">
          <h3 id="distribute-title" className="text-lg font-semibold text-zinc-900">
            Distribute Event
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Publish &ldquo;{event.title}&rdquo; to your selected channels
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          {done ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-800">
                Event distributed!
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Sent to {recipientCount || "all configured"} recipient
                {recipientCount === 1 ? "" : "s"} via{" "}
                {channels
                  .map(
                    (c) =>
                      DISTRIBUTION_CHANNELS.find((ch) => ch.id === c)?.label ??
                      c,
                  )
                  .join(", ")}
              </p>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-700">
                  Select channels
                </p>
                <div className="space-y-2">
                  {DISTRIBUTION_CHANNELS.map((channel) => (
                    <label
                      key={channel.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        channels.includes(channel.id)
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={channels.includes(channel.id)}
                        onChange={() => toggleChannel(channel.id)}
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {channel.label}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {channel.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {recipientCount > 0 && (
                <p className="text-xs text-zinc-500">
                  Recipients: {event.recipients.join(", ")}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-100 px-5 py-4">
          {!done && (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={distributing}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDistribute}
                disabled={distributing || channels.length === 0}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {distributing ? "Distributing..." : "Distribute Now"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
