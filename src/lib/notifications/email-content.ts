/**
 * Render the "new event added" email. Pure: no IO, no env reads.
 *
 * Produces plain-text and simple inline-styled HTML. The CTA deep-links the app
 * with ?event=<id>; the body carries our own signed-token unsubscribe link that
 * flips email_enabled without login. (InsForge separately injects its own
 * List-Unsubscribe header at the SES layer -- that suppresses future sends but
 * does not touch our preference row, so the in-body link is the source of truth
 * for the app-level opt-out.)
 */
import type { EventIngestedIntent } from "@/lib/notifications/types";

export type EventEmailInput = {
  intent: EventIngestedIntent;
  recipientName: string | null;
  appBaseUrl: string;
  unsubscribeUrl: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "Sat, Jul 12, 2026, 7:00 PM" in a fixed locale so output is deterministic. */
function formatEventDate(startAt: string): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return startAt;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export function buildEventDeepLink(appBaseUrl: string, eventId: string): string {
  const base = appBaseUrl.replace(/\/+$/, "");
  return `${base}/?event=${encodeURIComponent(eventId)}`;
}

export function buildEventIngestedEmail(input: EventEmailInput): RenderedEmail {
  const { intent, appBaseUrl, unsubscribeUrl } = input;
  const eventUrl = buildEventDeepLink(appBaseUrl, intent.eventId);
  const when = formatEventDate(intent.startAt);
  const where = intent.isOnline
    ? "Online"
    : intent.location?.trim() || "Location in the app";
  const addedBy = intent.addedByName?.trim() || "Someone in your group";

  const subject = `New on Event Radar: ${intent.title}`;

  const text = [
    `${addedBy} added a new event to Event Radar.`,
    "",
    intent.title,
    `When: ${when}`,
    `Where: ${where}`,
    "",
    `Open it: ${eventUrl}`,
    "",
    "---",
    `You are getting this because you opted in to new-event emails.`,
    `Unsubscribe (no login needed): ${unsubscribeUrl}`,
  ].join("\n");

  const html = `
<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #0a0a0a;">
  <p style="font-size: 14px; color: #555; margin: 0 0 16px;">${escapeHtml(addedBy)} added a new event to Event Radar.</p>
  <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px;">
    <h1 style="font-size: 18px; margin: 0 0 12px;">${escapeHtml(intent.title)}</h1>
    <p style="font-size: 14px; margin: 0 0 4px;"><strong>When:</strong> ${escapeHtml(when)}</p>
    <p style="font-size: 14px; margin: 0 0 16px;"><strong>Where:</strong> ${escapeHtml(where)}</p>
    <a href="${escapeHtml(eventUrl)}" style="display: inline-block; background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 9999px; font-size: 14px;">View event</a>
  </div>
  <p style="font-size: 12px; color: #888; margin: 20px 0 0;">
    You are getting this because you opted in to new-event emails.
    <a href="${escapeHtml(unsubscribeUrl)}" style="color: #888;">Unsubscribe</a> (no login needed).
  </p>
</div>`;

  return { subject, html, text };
}
