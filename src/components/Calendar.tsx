"use client";

import { useMemo } from "react";
import type { CalendarView, Event } from "@/types/event";
import {
  addDays,
  addMonths,
  eventOccursOnDay,
  formatMonthYear,
  formatTime,
  formatWeekRange,
  getMonthGrid,
  getWeekDays,
  isSameDay,
  isSameMonth,
} from "@/lib/dates";
import { statusDotColor } from "@/lib/event-styles";

interface CalendarProps {
  events: Event[];
  view: CalendarView;
  currentDate: Date;
  selectedDate: Date | null;
  selectedEventId: string | null;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar({
  events,
  view,
  currentDate,
  selectedDate,
  selectedEventId,
  onViewChange,
  onNavigate,
  onDateSelect,
  onEventSelect,
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);

  const headerLabel =
    view === "month" ? formatMonthYear(currentDate) : formatWeekRange(currentDate);

  const handlePrev = () => {
    onNavigate(view === "month" ? addMonths(currentDate, -1) : addDays(currentDate, -7));
  };

  const handleNext = () => {
    onNavigate(view === "month" ? addMonths(currentDate, 1) : addDays(currentDate, 7));
  };

  const handleToday = () => {
    onNavigate(new Date());
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Previous"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Next"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Today
          </button>
        </div>

        <h2 className="text-base font-semibold text-zinc-900">{headerLabel}</h2>

        <div className="flex rounded-lg border border-zinc-200 p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                view === v
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthView
          currentDate={currentDate}
          today={today}
          events={events}
          selectedDate={selectedDate}
          selectedEventId={selectedEventId}
          onDateSelect={onDateSelect}
          onEventSelect={onEventSelect}
        />
      ) : (
        <WeekView
          currentDate={currentDate}
          today={today}
          events={events}
          selectedEventId={selectedEventId}
          onDateSelect={onDateSelect}
          onEventSelect={onEventSelect}
        />
      )}
    </div>
  );
}

function MonthView({
  currentDate,
  today,
  events,
  selectedDate,
  selectedEventId,
  onDateSelect,
  onEventSelect,
}: {
  currentDate: Date;
  today: Date;
  events: Event[];
  selectedDate: Date | null;
  selectedEventId: string | null;
  onDateSelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
}) {
  const days = getMonthGrid(currentDate);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-100">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-auto">
        {days.map((day) => {
          const dayEvents = events.filter((e) =>
            eventOccursOnDay(e.startDate, e.endDate, day),
          );
          const inMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateSelect(day)}
              className={`min-h-[88px] border-b border-r border-zinc-100 p-1.5 text-left transition sm:min-h-[100px] sm:p-2 ${
                inMonth ? "bg-white hover:bg-zinc-50" : "bg-zinc-50/60 hover:bg-zinc-100/60"
              } ${isSelected ? "ring-2 ring-inset ring-indigo-400" : ""}`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-indigo-600 text-white"
                    : inMonth
                      ? "text-zinc-700"
                      : "text-zinc-400"
                }`}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventSelect(event);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onEventSelect(event);
                      }
                    }}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium sm:text-xs ${
                      selectedEventId === event.id
                        ? "bg-indigo-100 text-indigo-800"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor(event.status)}`}
                    />
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-zinc-500">
                    +{dayEvents.length - 3} more
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  currentDate,
  today,
  events,
  selectedEventId,
  onDateSelect,
  onEventSelect,
}: {
  currentDate: Date;
  today: Date;
  events: Event[];
  selectedEventId: string | null;
  onDateSelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
}) {
  const days = getWeekDays(currentDate);

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      <div className="grid grid-cols-7 border-b border-zinc-100">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateSelect(day)}
              className="border-r border-zinc-100 px-2 py-3 text-center last:border-r-0 hover:bg-zinc-50"
            >
              <p className="text-xs font-medium uppercase text-zinc-500">
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </p>
              <p
                className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isToday ? "bg-indigo-600 text-white" : "text-zinc-900"
                }`}
              >
                {day.getDate()}
              </p>
            </button>
          );
        })}
      </div>
      <div className="grid min-h-[320px] flex-1 grid-cols-7">
        {days.map((day) => {
          const dayEvents = events
            .filter((e) => eventOccursOnDay(e.startDate, e.endDate, day))
            .sort(
              (a, b) =>
                new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
            );

          return (
            <div
              key={day.toISOString()}
              className="space-y-2 border-r border-zinc-100 p-2 last:border-r-0"
            >
              {dayEvents.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 pt-4">No events</p>
              ) : (
                dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventSelect(event)}
                    className={`w-full rounded-lg border p-2 text-left transition ${
                      selectedEventId === event.id
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-900 line-clamp-2">
                      {event.title}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {formatTime(new Date(event.startDate))}
                    </p>
                  </button>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
