/** Unit tests for recipient selection on the event.ingested intent. */
import { describe, expect, it } from "vitest";
import {
  selectEmailRecipients,
  type EnabledPreferenceRow,
} from "@/lib/notifications/recipients";

function row(
  overrides: Partial<EnabledPreferenceRow> & { user_id: string },
): EnabledPreferenceRow {
  return {
    email_enabled: true,
    email: `${overrides.user_id}@example.com`,
    name: overrides.user_id,
    ...overrides,
  };
}

describe("selectEmailRecipients", () => {
  it("returns enabled users with an email", () => {
    const recipients = selectEmailRecipients(
      [row({ user_id: "a" }), row({ user_id: "b" })],
      null,
    );
    expect(recipients.map((r) => r.userId)).toEqual(["a", "b"]);
    expect(recipients[0]?.email).toBe("a@example.com");
  });

  it("excludes the actor who added the event", () => {
    const recipients = selectEmailRecipients(
      [row({ user_id: "actor" }), row({ user_id: "friend" })],
      "actor",
    );
    expect(recipients.map((r) => r.userId)).toEqual(["friend"]);
  });

  it("drops disabled rows and rows without an email", () => {
    const recipients = selectEmailRecipients(
      [
        row({ user_id: "off", email_enabled: false }),
        row({ user_id: "noemail", email: null }),
        row({ user_id: "blank", email: "  " }),
        row({ user_id: "keep" }),
      ],
      null,
    );
    expect(recipients.map((r) => r.userId)).toEqual(["keep"]);
  });

  it("dedupes repeated email addresses case-insensitively", () => {
    const recipients = selectEmailRecipients(
      [
        row({ user_id: "one", email: "dup@example.com" }),
        row({ user_id: "two", email: "DUP@example.com" }),
      ],
      null,
    );
    expect(recipients).toHaveLength(1);
    expect(recipients[0]?.userId).toBe("one");
  });

  it("returns nothing when nobody is enabled", () => {
    expect(selectEmailRecipients([], null)).toEqual([]);
  });
});
