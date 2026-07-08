/**
 * Unit tests for the Brevo email adapter. fetch is stubbed so no network call
 * runs; live delivery depends on the maintainer's BREVO_API_KEY plus a verified
 * sender and cannot be exercised here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendNotificationEmail } from "@/lib/notifications/email";
import type { EmailMessage } from "@/lib/notifications/types";

const ENV_KEYS = [
  "NOTIFICATIONS_EMAIL_ENABLED",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
];

const message: EmailMessage = {
  userId: "user_1",
  to: "friend@example.com",
  subject: "New on Event Radar: Board Games Night",
  html: "<p>hello</p>",
  text: "hello",
  unsubscribeUrl:
    "https://app.example.com/api/notifications/unsubscribe?token=abc.def",
};

function okResponse() {
  return new Response(JSON.stringify({ messageId: "<msg-123@relay>" }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

describe("sendNotificationEmail (Brevo adapter)", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("dry-runs and sends nothing when delivery is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotificationEmail(message);

    expect(result).toEqual({ sent: false, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to the Brevo endpoint with the api-key header and payload shape", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.BREVO_API_KEY = "xkeysib-secret";
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotificationEmail(message);

    expect(result).toEqual({ sent: true, skipped: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("xkeysib-secret");
    expect(headers.accept).toBe("application/json");
    expect(headers["content-type"]).toBe("application/json");

    const payload = JSON.parse(init.body as string);
    expect(payload.sender).toEqual({
      email: "events@example.com",
      name: "Event Radar",
    });
    expect(payload.to).toEqual([{ email: "friend@example.com" }]);
    expect(payload.subject).toBe(message.subject);
    expect(payload.htmlContent).toBe(message.html);
    expect(payload.textContent).toBe(message.text);
  });

  it("sets one-click List-Unsubscribe headers from the unsubscribe URL", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.BREVO_API_KEY = "xkeysib-secret";
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await sendNotificationEmail(message);

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const payload = JSON.parse(init.body as string);
    expect(payload.headers["List-Unsubscribe"]).toBe(
      "<https://app.example.com/api/notifications/unsubscribe?token=abc.def>",
    );
    expect(payload.headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  it("omits the headers object when no unsubscribe URL is present", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.BREVO_API_KEY = "xkeysib-secret";
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await sendNotificationEmail({ ...message, unsubscribeUrl: undefined });

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const payload = JSON.parse(init.body as string);
    expect(payload.headers).toBeUndefined();
  });

  it("throws with status and body on a non-2xx Brevo response", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.BREVO_API_KEY = "xkeysib-secret";
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    const fetchMock = vi.fn(
      async () =>
        new Response('{"code":"unauthorized","message":"bad key"}', {
          status: 401,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendNotificationEmail(message)).rejects.toThrow(
      /Brevo send failed \(HTTP 401\).*bad key/,
    );
  });

  it("fails loud when delivery is enabled but the api key is missing", async () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendNotificationEmail(message)).rejects.toThrow(
      /BREVO_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
