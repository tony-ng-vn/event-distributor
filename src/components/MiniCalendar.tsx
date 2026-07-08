/**
 * Sidebar / mobile calendar — month grid that filters the feed by day.
 * Dots mark days that have events. The "Your events" list itself renders the
 * shared EventFeedCard (see FeedApp), so this file no longer owns a list view.
 */
"use client";

import {
  addMonths,
  formatMonthYear,
  getMonthGrid,
  isSameDay,
  isSameMonth,
  startOfMonth,
} from "@/lib/dates";
import type { FeedEvent } from "@/types/feed";

export function MiniCalendar({
  events,
  currentDate,
  selectedDate,
  onSelectDate,
  onNavigate,
}: {
  events: FeedEvent[];
  currentDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onNavigate: (date: Date) => void;
}) {
  const days = getMonthGrid(currentDate);
  const eventDays = new Set(
    events.flatMap((event) => {
      const start = new Date(event.startAt);
      return [start.toDateString()];
    }),
  );

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {formatMonthYear(currentDate)}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onNavigate(addMonths(currentDate, -1))}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-white/50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => onNavigate(addMonths(currentDate, 1))}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-white/50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-muted/70">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const hasEvent = eventDays.has(day.toDateString());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(selected ? null : day)}
              className={`relative flex h-9 items-center justify-center rounded-lg text-sm transition active:scale-[0.97] ${
                selected
                  ? "bg-foreground text-white"
                  : inMonth
                    ? "text-foreground hover:bg-background-subtle"
                    : "text-muted/40"
              }`}
            >
              {day.getDate()}
              {hasEvent && !selected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="mt-3 text-xs font-medium text-foreground-secondary hover:text-foreground"
        >
          Clear date filter
        </button>
      )}
    </div>
  );
}

export { startOfMonth };
