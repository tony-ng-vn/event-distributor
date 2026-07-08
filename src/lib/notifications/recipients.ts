/**
 * Pure recipient selection for the event.ingested intent.
 *
 * Given the enabled-preference rows joined to their user, drop the actor and any
 * row missing a usable email. Kept IO-free so it is exhaustively unit-testable
 * without live InsForge credentials.
 */
import type { EmailRecipient } from "@/lib/notifications/types";

export type EnabledPreferenceRow = {
  user_id: string;
  email_enabled: boolean;
  email: string | null;
  name: string | null;
};

export function selectEmailRecipients(
  rows: EnabledPreferenceRow[],
  actorUserId: string | null,
): EmailRecipient[] {
  const seen = new Set<string>();
  const recipients: EmailRecipient[] = [];

  for (const row of rows) {
    if (!row.email_enabled) continue;
    if (actorUserId && row.user_id === actorUserId) continue;

    const email = row.email?.trim();
    if (!email) continue;

    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    recipients.push({ userId: row.user_id, email, name: row.name });
  }

  return recipients;
}
