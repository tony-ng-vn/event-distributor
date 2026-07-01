/** Unit tests for legacy Google Calendar sync (mock mode). */
import { describe, expect, it } from "vitest";
import { buildCalendarEventPayload, syncEventToGoogleCalendar } from "@/lib/calendar";

const baseEvent = {
  id: "evt-1",
  lumaUrl: "https://lu.ma/demo",
  title: "Demo Night",
  description: "A great event",
  startAt: new Date("2026-08-01T19:00:00.000Z"),
  endAt: new Date("2026-08-01T21:00:00.000Z"),
  location: "SF",
  isOnline: false,
  meetingUrl: null,
};

const baseUser = {
  id: "user-1",
  email: "guest@example.com",
  googleRefreshToken: null,
  googleAccessToken: null,
};

describe("calendar sync", () => {
  it("builds payload with attendee, reminders, and accepted status", () => {
    const payload = buildCalendarEventPayload(baseEvent, baseUser);

    expect(payload.summary).toBe("Demo Night");
    expect(payload.attendees).toEqual([
      { email: "guest@example.com", responseStatus: "accepted" },
    ]);
    expect(payload.reminders).toEqual({
      useDefault: false,
      overrides: [
        { method: "email", minutes: 1440 },
        { method: "popup", minutes: 60 },
      ],
    });
  });

  it("uses mock calendar id when CALENDAR_PROVIDER is mock", async () => {
    process.env.CALENDAR_PROVIDER = "mock";

    const result = await syncEventToGoogleCalendar(baseEvent, {
      ...baseUser,
      googleRefreshToken: "token",
    });

    expect(result.synced).toBe(true);
    expect(result.googleCalendarEventId).toBe("mock-cal-evt-1-user-1");
  });
});
