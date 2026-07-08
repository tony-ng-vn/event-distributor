/** Unit tests for the new-event email body (plain text + HTML). */
import { describe, expect, it } from "vitest";
import {
  buildEventDeepLink,
  buildEventIngestedEmail,
} from "@/lib/notifications/email-content";
import type { EventIngestedIntent } from "@/lib/notifications/types";

const intent: EventIngestedIntent = {
  type: "event.ingested",
  eventId: "evt_123",
  title: "AI Meetup",
  startAt: "2026-07-12T19:00:00.000Z",
  isOnline: false,
  location: "San Francisco, CA",
  actorUserId: "actor",
  addedByName: "Alex",
};

const unsubscribeUrl =
  "https://app.example.com/api/notifications/unsubscribe?token=abc";

describe("buildEventIngestedEmail", () => {
  it("puts the title in the subject", () => {
    const email = buildEventIngestedEmail({
      intent,
      recipientName: "Sam",
      appBaseUrl: "https://app.example.com",
      unsubscribeUrl,
    });
    expect(email.subject).toContain("AI Meetup");
  });

  it("includes title, date, adder, location, CTA deep link and unsubscribe in the text body", () => {
    const email = buildEventIngestedEmail({
      intent,
      recipientName: "Sam",
      appBaseUrl: "https://app.example.com",
      unsubscribeUrl,
    });
    expect(email.text).toContain("AI Meetup");
    expect(email.text).toContain("Alex");
    expect(email.text).toContain("San Francisco, CA");
    expect(email.text).toContain("https://app.example.com/?event=evt_123");
    expect(email.text).toContain(unsubscribeUrl);
  });

  it("puts the deep link and unsubscribe link in the HTML body", () => {
    const email = buildEventIngestedEmail({
      intent,
      recipientName: "Sam",
      appBaseUrl: "https://app.example.com",
      unsubscribeUrl,
    });
    expect(email.html).toContain("https://app.example.com/?event=evt_123");
    expect(email.html).toContain(unsubscribeUrl);
  });

  it("shows Online instead of a location for virtual events", () => {
    const email = buildEventIngestedEmail({
      intent: { ...intent, isOnline: true, location: null },
      recipientName: null,
      appBaseUrl: "https://app.example.com",
      unsubscribeUrl,
    });
    expect(email.text).toContain("Online");
  });

  it("falls back to a friendly adder label when addedByName is missing", () => {
    const email = buildEventIngestedEmail({
      intent: { ...intent, addedByName: null },
      recipientName: null,
      appBaseUrl: "https://app.example.com",
      unsubscribeUrl,
    });
    expect(email.text).toContain("Someone in your group");
  });

  it("escapes HTML-unsafe characters in the title", () => {
    const email = buildEventIngestedEmail({
      intent: { ...intent, title: "Tacos & <script>" },
      recipientName: null,
      appBaseUrl: "https://app.example.com",
      unsubscribeUrl,
    });
    expect(email.html).toContain("Tacos &amp; &lt;script&gt;");
    expect(email.html).not.toContain("<script>");
  });

  it("builds a deep link that survives a trailing slash in the base url", () => {
    expect(buildEventDeepLink("https://app.example.com/", "evt_9")).toBe(
      "https://app.example.com/?event=evt_9",
    );
  });
});
