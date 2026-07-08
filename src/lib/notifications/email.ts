/**
 * Email channel adapter over Brevo's transactional REST API.
 *
 * We POST straight to https://api.brevo.com/v3/smtp/email with fetch -- no SDK
 * dependency needed for one endpoint. Brevo's free tier (300 emails/day, one
 * verified sender) covers this friend-group app; the previous InsForge
 * emails.send path is a paid feature and returned 403 in prod.
 *
 * Delivery is gated by isEmailDeliveryEnabled(): when off, the adapter logs a
 * dry-run line (user id, never the address) and sends nothing, so development
 * and CI never mail the real friend group. Config getters (api key, sender) are
 * only read on the real-send branch, so the dry-run path needs no Brevo setup.
 */
import {
  getBrevoApiKey,
  getBrevoSender,
  isEmailDeliveryEnabled,
} from "@/lib/notifications/config";
import type { EmailMessage } from "@/lib/notifications/types";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type SendResult = { sent: boolean; skipped: boolean };

/**
 * Custom headers for one-click unsubscribe (RFC 8058). The URL points at our
 * POST unsubscribe endpoint with the recipient's signed token; the endpoint
 * reads the token from the query and ignores the body, so a one-click POST works.
 */
function unsubscribeHeaders(
  unsubscribeUrl: string | undefined,
): Record<string, string> {
  if (!unsubscribeUrl) return {};
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Send one rendered email, honoring the dry-run delivery guard. */
export async function sendNotificationEmail(
  message: EmailMessage,
): Promise<SendResult> {
  if (!isEmailDeliveryEnabled()) {
    // Guard: no real send unless NOTIFICATIONS_EMAIL_ENABLED=true.
    // Log the user id, not the email address (PII).
    console.info(
      `[notifications] dry-run email to user ${message.userId}: ${message.subject}`,
    );
    return { sent: false, skipped: true };
  }

  const sender = getBrevoSender();
  const headers = unsubscribeHeaders(message.unsubscribeUrl);

  const body = {
    sender,
    to: [{ email: message.to }],
    subject: message.subject,
    htmlContent: message.html,
    textContent: message.text,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };

  const response = await fetch(BREVO_ENDPOINT, {
    method: "POST",
    headers: {
      "api-key": getBrevoApiKey(),
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Body may not be JSON on an error; read as text so nothing is lost.
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Brevo send failed (HTTP ${response.status}): ${detail || response.statusText}`,
    );
  }

  return { sent: true, skipped: false };
}
