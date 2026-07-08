/**
 * Email channel adapter over InsForge's managed sender (SES under the hood).
 *
 * Uses an anon-key client -- the documented, tested path for emails.send -- not
 * the admin client. Delivery is gated by isEmailDeliveryEnabled(): when off, the
 * adapter logs a dry-run line and sends nothing, so development and CI never mail
 * the real friend group. InsForge appends its own List-Unsubscribe header per
 * recipient; we do not (and cannot) set headers here.
 */
import { createClient } from "@insforge/sdk";
import { isEmailDeliveryEnabled } from "@/lib/notifications/config";
import type { EmailMessage } from "@/lib/notifications/types";

const EMAIL_FROM_NAME = "Event Radar";

let cachedClient: ReturnType<typeof createClient> | null = null;

function getEmailClient() {
  if (cachedClient) return cachedClient;

  const baseUrl =
    process.env.NEXT_PUBLIC_INSFORGE_URL ?? process.env.INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error(
      "InsForge email client is not configured. Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY.",
    );
  }

  cachedClient = createClient({ baseUrl, anonKey });
  return cachedClient;
}

export type SendResult = { sent: boolean; skipped: boolean };

/** Send one rendered email, honoring the dry-run delivery guard. */
export async function sendNotificationEmail(
  message: EmailMessage,
): Promise<SendResult> {
  if (!isEmailDeliveryEnabled()) {
    // Guard: no real send unless NOTIFICATIONS_EMAIL_ENABLED=true.
    console.info(
      `[notifications] dry-run email to ${message.to}: ${message.subject}`,
    );
    return { sent: false, skipped: true };
  }

  const { error } = await getEmailClient().emails.send({
    to: message.to,
    subject: message.subject,
    html: message.html,
    from: EMAIL_FROM_NAME,
  });

  if (error) throw new Error(error.message);
  return { sent: true, skipped: false };
}
