/**
 * Env-backed configuration for the notification system.
 *
 * Delivery is OFF by default. Emails only leave the building when
 * NOTIFICATIONS_EMAIL_ENABLED === "true". Any other value (unset, "false", dev)
 * runs the adapter in dry-run: it logs the payload and sends nothing. This is
 * the guard that keeps development and CI from mailing the real friend group.
 */

const DEFAULT_APP_URL = "http://localhost:3000";

export function getAppBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_BASE_URL ??
    DEFAULT_APP_URL;
  return url.replace(/\/+$/, "");
}

/** Secret for signing unsubscribe tokens. Empty string when unset. */
export function getUnsubscribeSecret(): string {
  return process.env.NOTIFICATION_UNSUBSCRIBE_SECRET ?? "";
}

/** True only when real email delivery is explicitly enabled. */
export function isEmailDeliveryEnabled(): boolean {
  return process.env.NOTIFICATIONS_EMAIL_ENABLED === "true";
}
