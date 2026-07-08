/**
 * Unit tests for the dispatcher: given an intent + deps, who gets mailed and
 * what the payload says. Deps are injected so no live InsForge or real send runs.
 */
import { describe, expect, it, vi } from "vitest";
import {
  dispatchEventIngested,
  type DispatchDeps,
} from "@/lib/notifications/dispatcher";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import type {
  EmailMessage,
  EmailRecipient,
  EventIngestedIntent,
} from "@/lib/notifications/types";

const SECRET = "dispatch-secret";

const intent: EventIngestedIntent = {
  type: "event.ingested",
  eventId: "evt_1",
  title: "Board Games Night",
  startAt: "2026-07-12T19:00:00.000Z",
  isOnline: false,
  location: "The Commons",
  actorUserId: "actor",
  addedByName: "Alex",
};

function makeDeps(
  recipients: EmailRecipient[],
  sendEmail = vi.fn(async () => ({})),
): DispatchDeps {
  return {
    loadRecipients: vi.fn(async () => recipients),
    sendEmail,
    appBaseUrl: "https://app.example.com",
    unsubscribeSecret: SECRET,
  };
}

describe("dispatchEventIngested", () => {
  it("sends one email per enabled recipient", async () => {
    const send = vi.fn(async () => ({}));
    const deps = makeDeps(
      [
        { userId: "a", email: "a@example.com", name: "A" },
        { userId: "b", email: "b@example.com", name: "B" },
      ],
      send,
    );

    const result = await dispatchEventIngested(intent, deps);

    expect(result.recipientCount).toBe(2);
    expect(result.failures).toBe(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.messages.map((m) => m.to)).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("asks the recipient loader to exclude the actor", async () => {
    const deps = makeDeps([]);
    await dispatchEventIngested(intent, deps);
    expect(deps.loadRecipients).toHaveBeenCalledWith("actor");
  });

  it("sends nothing when no one is enabled", async () => {
    const send = vi.fn(async () => ({}));
    const deps = makeDeps([], send);
    const result = await dispatchEventIngested(intent, deps);
    expect(result.recipientCount).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });

  it("embeds a valid, per-recipient unsubscribe token and event deep link", async () => {
    const deps = makeDeps([{ userId: "a", email: "a@example.com", name: "A" }]);
    const result = await dispatchEventIngested(intent, deps);
    const message = result.messages[0] as EmailMessage;

    expect(message.text).toContain("https://app.example.com/?event=evt_1");

    const match = message.text.match(/token=([^\s]+)/);
    expect(match).toBeTruthy();
    const token = decodeURIComponent(match?.[1] ?? "");
    expect(verifyUnsubscribeToken(token, SECRET)).toBe("a");
  });

  it("counts a send failure without throwing and keeps sending the rest", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce({});
    const deps = makeDeps(
      [
        { userId: "a", email: "a@example.com", name: "A" },
        { userId: "b", email: "b@example.com", name: "B" },
      ],
      send,
    );

    const result = await dispatchEventIngested(intent, deps);
    expect(result.failures).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("skips entirely when no unsubscribe secret is configured", async () => {
    const send = vi.fn(async () => ({}));
    const deps: DispatchDeps = {
      ...makeDeps([{ userId: "a", email: "a@example.com", name: "A" }], send),
      unsubscribeSecret: "",
    };
    const result = await dispatchEventIngested(intent, deps);
    expect(result.recipientCount).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
});
