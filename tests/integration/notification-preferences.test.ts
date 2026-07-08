/**
 * Integration tests for notification preferences + recipient loading against a
 * live InsForge database. These exercise the DB layer the unit tests cannot:
 * the upsert, disable-on-unsubscribe, and the recipient query (two-query join).
 *
 * Like events-service integration tests, these require a non-production InsForge
 * branch and are skipped/blocked otherwise.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createUser, resetDatabase } from "@/lib/events-service";
import {
  disableEmailForUser,
  getNotificationPreference,
  loadEmailRecipients,
  upsertNotificationPreference,
} from "@/lib/notifications/preferences";

describe("notification preferences (integration)", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("returns defaults for a user with no row", async () => {
    const user = await createUser({ email: "a@example.com", name: "A" });
    const pref = await getNotificationPreference(user.id);
    expect(pref).toEqual({
      userId: user.id,
      emailEnabled: false,
      hasResponded: false,
    });
  });

  it("creates then updates the row via upsert", async () => {
    const user = await createUser({ email: "a@example.com", name: "A" });

    const created = await upsertNotificationPreference(user.id, {
      emailEnabled: true,
    });
    expect(created.emailEnabled).toBe(true);
    expect(created.hasResponded).toBe(true);

    const updated = await upsertNotificationPreference(user.id, {
      emailEnabled: false,
    });
    expect(updated.emailEnabled).toBe(false);

    const fetched = await getNotificationPreference(user.id);
    expect(fetched.emailEnabled).toBe(false);
    expect(fetched.hasResponded).toBe(true);
  });

  it("disableEmailForUser turns email off and records a response", async () => {
    const user = await createUser({ email: "a@example.com", name: "A" });
    await upsertNotificationPreference(user.id, { emailEnabled: true });

    await disableEmailForUser(user.id);

    const pref = await getNotificationPreference(user.id);
    expect(pref.emailEnabled).toBe(false);
    expect(pref.hasResponded).toBe(true);
  });

  it("disableEmailForUser is safe for a user with no row", async () => {
    const user = await createUser({ email: "a@example.com", name: "A" });
    await disableEmailForUser(user.id);
    const pref = await getNotificationPreference(user.id);
    expect(pref.emailEnabled).toBe(false);
  });

  it("loads only enabled recipients and excludes the actor", async () => {
    const actor = await createUser({ email: "actor@example.com", name: "Actor" });
    const friend = await createUser({ email: "friend@example.com", name: "Friend" });
    const optedOut = await createUser({ email: "off@example.com", name: "Off" });

    await upsertNotificationPreference(actor.id, { emailEnabled: true });
    await upsertNotificationPreference(friend.id, { emailEnabled: true });
    await upsertNotificationPreference(optedOut.id, { emailEnabled: false });

    const recipients = await loadEmailRecipients(actor.id);

    expect(recipients.map((r) => r.email)).toEqual(["friend@example.com"]);
    expect(recipients[0]?.name).toBe("Friend");
  });

  it("returns no recipients when nobody has enabled email", async () => {
    const user = await createUser({ email: "a@example.com", name: "A" });
    await upsertNotificationPreference(user.id, { emailEnabled: false });
    expect(await loadEmailRecipients(null)).toEqual([]);
  });
});
