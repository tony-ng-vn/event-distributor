/**
 * Date/time helpers for the feed, calendar, and event cards.
 *
 * No external libraries -- plain JavaScript Date + toLocaleDateString.
 * Used by: MiniCalendar, EventFeedCard, EventDetailSheet, feed partitioning
 */

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  return addDays(d, -day);
}

/** 6 rows x 7 days = standard month calendar grid. */
export function getMonthGrid(date: Date): Date[] {
  const first = startOfMonth(date);
  const gridStart = getWeekStart(first);
  const days: Date[] = [];

  for (let i = 0; i < 42; i += 1) {
    days.push(addDays(gridStart, i));
  }

  return days;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Card/detail subtitle, e.g. "Wed, Jul 1, 5:30 PM". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
