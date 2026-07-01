/**
 * Google Calendar sync (legacy / not used in Accept flow today).
 *
 * Product direction: Accept = in-app social signal only; RSVP happens on Luma.
 * This module remains for future calendar integration and unit tests.
 *
 * CALENDAR_PROVIDER=mock skips real Google API calls.
 */
import { google } from "googleapis";

type CalendarUser = {
  id: string;
  email: string;
  googleRefreshToken?: string | null;
  googleAccessToken?: string | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  lumaUrl: string;
  isOnline: boolean;
  meetingUrl: string | null;
  location: string;
  startAt: Date;
  endAt: Date;
};

export interface CalendarSyncResult {
  googleCalendarEventId: string;
  synced: boolean;
}

/** Builds the payload Google Calendar API expects when creating an event. */
export function buildCalendarEventPayload(event: CalendarEvent, user: CalendarUser) {
  return {
    summary: event.title,
    description: `${event.description}\n\nEvent link: ${event.lumaUrl}`,
    location: event.isOnline
      ? (event.meetingUrl ?? "Online")
      : event.location || undefined,
    start: { dateTime: event.startAt.toISOString() },
    end: { dateTime: event.endAt.toISOString() },
    source: {
      title: "Luma",
      url: event.lumaUrl,
    },
    attendees: user.email
      ? [{ email: user.email, responseStatus: "accepted" as const }]
      : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email" as const, minutes: 24 * 60 },
        { method: "popup" as const, minutes: 60 },
      ],
    },
  };
}

export async function syncEventToGoogleCalendar(
  event: CalendarEvent,
  user: CalendarUser,
): Promise<CalendarSyncResult> {
  if (process.env.CALENDAR_PROVIDER === "mock" || !user.googleRefreshToken) {
    return {
      googleCalendarEventId: `mock-cal-${event.id}-${user.id}`,
      synced: true,
    };
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return {
      googleCalendarEventId: `mock-cal-${event.id}-${user.id}`,
      synced: false,
    };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    refresh_token: user.googleRefreshToken,
    access_token: user.googleAccessToken ?? undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const calendarEvent = await calendar.events.insert({
    calendarId: "primary",
    sendUpdates: "all",
    requestBody: buildCalendarEventPayload(event, user),
  });

  return {
    googleCalendarEventId: calendarEvent.data.id ?? `google-${event.id}`,
    synced: true,
  };
}
