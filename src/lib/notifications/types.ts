/**
 * Domain notification intents and the shared shapes the dispatcher works with.
 *
 * The event mutation layer emits intents; a dispatcher consumes them, resolves
 * per-user preferences, and hands payloads to channel adapters. API routes and
 * UI stay unaware of delivery mechanics.
 */

/** Minimal event shape an intent needs. Decoupled from the feed FeedEvent type. */
export type EventIngestedIntent = {
  type: "event.ingested";
  eventId: string;
  title: string;
  startAt: string;
  isOnline: boolean;
  location: string | null;
  /** User who added the event; excluded from recipients. */
  actorUserId: string | null;
  addedByName: string | null;
};

/** A user eligible to receive a notification email. */
export type EmailRecipient = {
  userId: string;
  email: string;
  name: string | null;
};

/** A rendered, ready-to-send email for one recipient. */
export type EmailMessage = {
  /** Recipient user id -- used for logging instead of the email address (PII). */
  userId: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Per-recipient signed unsubscribe URL. Used to set the List-Unsubscribe
   * header for one-click opt-out; the same link also appears in the body.
   */
  unsubscribeUrl?: string;
};
