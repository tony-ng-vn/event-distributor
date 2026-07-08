/**
 * Env-backed configuration for the notification system.
 *
 * Delivery is OFF by default. Emails only leave the building when
 * NOTIFICATIONS_EMAIL_ENABLED === "true". Any other value (unset, "false", dev)
 * runs the adapter in dry-run: it logs the payload and sends nothing. This is
 * the guard that keeps development and CI from mailing the real friend group.
 */

const DEFAULT_APP_URL = "http://localhost:3000";

/**
 * Base URL for email CTA and unsubscribe links.
 *
 * When real delivery is on we refuse to fall back to localhost: an unset
 * NEXT_PUBLIC_APP_URL would otherwise mail the group links that point at
 * localhost -- broken and, worse, un-unsubscribable. The localhost fallback is
 * only for the dry-run/dev path.
 */
export function getAppBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL ?? null;

  if (configured) return configured.replace(/\/+$/, "");

  if (isEmailDeliveryEnabled()) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set but NOTIFICATIONS_EMAIL_ENABLED=true. Refusing to send email with localhost links.",
    );
  }

  return DEFAULT_APP_URL;
}

/** Secret for signing unsubscribe tokens. Empty string when unset. */
export function getUnsubscribeSecret(): string {
  return process.env.NOTIFICATION_UNSUBSCRIBE_SECRET ?? "";
}

/** True only when real email delivery is explicitly enabled. */
export function isEmailDeliveryEnabled(): boolean {
  return process.env.NOTIFICATIONS_EMAIL_ENABLED === "true";
}

const DEFAULT_SENDER_NAME = "Event Radar";

/**
 * Brevo transactional API key. Fail loud: an unset key on the real-send path
 * would otherwise surface as an opaque 401 from Brevo per recipient. Only called
 * once delivery is enabled, so the dry-run/dev path never needs it.
 */
export function getBrevoApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error(
      "BREVO_API_KEY is not set but real email delivery is enabled. Set BREVO_API_KEY.",
    );
  }
  return key;
}

/**
 * Verified Brevo sender (from address + display name). The email must be a
 * sender Brevo has verified, or Brevo rejects the send. Name defaults to
 * "Event Radar" when unset.
 */
export function getBrevoSender(): { email: string; name: string } {
  const email = process.env.BREVO_SENDER_EMAIL;
  if (!email) {
    throw new Error(
      "BREVO_SENDER_EMAIL is not set but real email delivery is enabled. Set BREVO_SENDER_EMAIL to a Brevo-verified sender.",
    );
  }
  const name = process.env.BREVO_SENDER_NAME?.trim() || DEFAULT_SENDER_NAME;
  return { email, name };
}
