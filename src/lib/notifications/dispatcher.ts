/**
 * Consumes notification intents, resolves recipients + payloads, and hands each
 * message to the email adapter. This is the single place delivery mechanics live;
 * the event mutation layer only emits an intent.
 *
 * Dependencies (recipient loading, sending, config) are injectable so the mapping
 * logic -- who gets mailed and what the payload says -- is unit-testable without
 * live InsForge credentials or real email sends.
 *
 * Note on duplicate ingest: ingestLumaEvent rejects a duplicate luma_url before
 * it ever emits an intent (see events-service and the "rejects duplicate" test),
 * and the emit happens only after a successful insert, so a re-ingest cannot
 * double-send. The dispatcher therefore needs no separate idempotency key here.
 */
import {
  getAppBaseUrl,
  getUnsubscribeSecret,
} from "@/lib/notifications/config";
import { buildEventIngestedEmail } from "@/lib/notifications/email-content";
import { sendNotificationEmail } from "@/lib/notifications/email";
import { loadEmailRecipients } from "@/lib/notifications/preferences";
import { signUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import type {
  EmailMessage,
  EmailRecipient,
  EventIngestedIntent,
} from "@/lib/notifications/types";

export type DispatchDeps = {
  loadRecipients: (actorUserId: string | null) => Promise<EmailRecipient[]>;
  sendEmail: (message: EmailMessage) => Promise<unknown>;
  appBaseUrl: string;
  unsubscribeSecret: string;
};

export type DispatchResult = {
  recipientCount: number;
  messages: EmailMessage[];
  failures: number;
};

function defaultDeps(): DispatchDeps {
  return {
    loadRecipients: loadEmailRecipients,
    sendEmail: sendNotificationEmail,
    appBaseUrl: getAppBaseUrl(),
    unsubscribeSecret: getUnsubscribeSecret(),
  };
}

function buildUnsubscribeUrl(
  appBaseUrl: string,
  token: string,
): string {
  const base = appBaseUrl.replace(/\/+$/, "");
  return `${base}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Build the per-recipient message for an event.ingested intent. */
export function buildMessagesForEventIngested(
  intent: EventIngestedIntent,
  recipients: EmailRecipient[],
  appBaseUrl: string,
  unsubscribeSecret: string,
): EmailMessage[] {
  return recipients.map((recipient) => {
    const token = signUnsubscribeToken(recipient.userId, unsubscribeSecret);
    const unsubscribeUrl = buildUnsubscribeUrl(appBaseUrl, token);
    const rendered = buildEventIngestedEmail({
      intent,
      recipientName: recipient.name,
      appBaseUrl,
      unsubscribeUrl,
    });
    return {
      userId: recipient.userId,
      to: recipient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
  });
}

/**
 * Resolve recipients, render messages, and send. Never throws for an individual
 * send failure -- failures are counted and logged so one bad address cannot
 * abort the batch (and, upstream, cannot fail the ingest).
 */
export async function dispatchEventIngested(
  intent: EventIngestedIntent,
  deps: DispatchDeps = defaultDeps(),
): Promise<DispatchResult> {
  if (!deps.unsubscribeSecret) {
    // Without a secret we cannot mint valid unsubscribe links; skip rather than
    // send un-unsubscribable email.
    console.warn(
      "[notifications] NOTIFICATION_UNSUBSCRIBE_SECRET is unset; skipping event.ingested email.",
    );
    return { recipientCount: 0, messages: [], failures: 0 };
  }

  const recipients = await deps.loadRecipients(intent.actorUserId);
  const messages = buildMessagesForEventIngested(
    intent,
    recipients,
    deps.appBaseUrl,
    deps.unsubscribeSecret,
  );

  let failures = 0;
  for (const message of messages) {
    try {
      await deps.sendEmail(message);
    } catch (error) {
      failures += 1;
      const reason = error instanceof Error ? error.message : "unknown error";
      // Log the user id, not the email address (PII).
      console.error(
        `[notifications] failed to send to user ${message.userId}: ${reason}`,
      );
    }
  }

  return { recipientCount: recipients.length, messages, failures };
}
