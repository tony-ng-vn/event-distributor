/**
 * Date/time helpers for the feed, calendar, and event cards.
 *
 * No external libraries — plain JavaScript Date + toLocaleDateString.
 * Used by: MiniCalendar, EventFeedCard, EventDetailSheet, FeedApp filters
 */

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function addDays(date: Date, days: number): Date {
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

export function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  return addDays(d, -day);
}

/** 6 rows × 7 days = standard month calendar grid. */
export function getMonthGrid(date: Date): Date[] {
  const first = startOfMonth(date);
  const gridStart = getWeekStart(first);
  const days: Date[] = [];

  for (let i = 0; i < 42; i += 1) {
    days.push(addDays(gridStart, i));
  }

  return days;
}

export function getWeekDays(date: Date): Date[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeekRange(date: Date): string {
  const start = getWeekStart(date);
  const end = addDays(start, 6);

  const startStr = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startStr} – ${endStr}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export function eventOccursOnDay(isoStart: string, isoEnd: string, day: Date): boolean {
  const start = startOfDay(new Date(isoStart));
  const end = startOfDay(new Date(isoEnd));
  const target = startOfDay(day);

  return target >= start && target <= end;
}

export function isUpcoming(iso: string): boolean {
  return new Date(iso) >= new Date();
}

/** Card subtitle, e.g. "Wed, Jul 1, 5:30 PM". */
export function formatCardDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Today, 5:30 PM" / "Tomorrow, …" when close; otherwise full date. */
export function formatRelativeDateTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const tomorrow = addDays(startOfDay(now), 1);
  const dayAfter = addDays(startOfDay(now), 2);

  const time = formatTime(date);
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, tomorrow)) return `Tomorrow, ${time}`;
  if (isSameDay(date, dayAfter)) return `Day after tomorrow, ${time}`;

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
