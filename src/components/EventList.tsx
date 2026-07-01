"use client";

import type { Event } from "@/types/event";
import { formatDateTime } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";

interface EventListProps {
  events: Event[];
  selectedId: string | null;
  onSelect: (event: Event) => void;
  onCreateNew: () => void;
}

export function EventList({
  events,
  selectedId,
  onSelect,
  onCreateNew,
}: EventListProps) {
  const upcoming = [...events]
    .filter((e) => new Date(e.endDate) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  return (
    <aside className="flex h-full flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Upcoming Events</h2>
        <button
          type="button"
          onClick={onCreateNew}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
            <p className="text-sm font-medium text-zinc-700">No upcoming events</p>
            <p className="mt-1 text-xs text-zinc-500">
              Create an event to get started
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Create your first event
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === event.id
                      ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                      {event.title}
                    </p>
                    <StatusBadge status={event.status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDateTime(event.startDate)}
                  </p>
                  {event.location && (
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
                      {event.location}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
