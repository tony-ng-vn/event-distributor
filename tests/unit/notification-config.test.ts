/** Unit tests for notification config, esp. the fail-loud base URL guard. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAppBaseUrl,
  getBrevoApiKey,
  getBrevoSender,
  isEmailDeliveryEnabled,
  isIncludeActorEnabled,
} from "@/lib/notifications/config";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "APP_BASE_URL",
  "NOTIFICATIONS_EMAIL_ENABLED",
  "NOTIFICATIONS_TEST_INCLUDE_SELF",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
];

describe("notification config", () => {
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("returns the configured URL with trailing slashes stripped", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    expect(getAppBaseUrl()).toBe("https://app.example.com");
  });

  it("falls back to localhost in the dry-run path", () => {
    expect(isEmailDeliveryEnabled()).toBe(false);
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });

  it("refuses to fall back to localhost when delivery is enabled", () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    expect(isEmailDeliveryEnabled()).toBe(true);
    expect(() => getAppBaseUrl()).toThrow(/localhost/i);
  });

  it("uses the configured URL even when delivery is enabled", () => {
    process.env.NOTIFICATIONS_EMAIL_ENABLED = "true";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(getAppBaseUrl()).toBe("https://app.example.com");
  });

  it("includes the actor only when the flag is exactly \"true\"", () => {
    expect(isIncludeActorEnabled()).toBe(false);
    process.env.NOTIFICATIONS_TEST_INCLUDE_SELF = "1";
    expect(isIncludeActorEnabled()).toBe(false);
    process.env.NOTIFICATIONS_TEST_INCLUDE_SELF = "true";
    expect(isIncludeActorEnabled()).toBe(true);
  });

  it("throws fail-loud when the Brevo api key is missing", () => {
    expect(() => getBrevoApiKey()).toThrow(/BREVO_API_KEY/);
    process.env.BREVO_API_KEY = "xkeysib-abc";
    expect(getBrevoApiKey()).toBe("xkeysib-abc");
  });

  it("throws fail-loud when the Brevo sender email is missing", () => {
    expect(() => getBrevoSender()).toThrow(/BREVO_SENDER_EMAIL/);
  });

  it("returns the sender with the default name when name is unset", () => {
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    expect(getBrevoSender()).toEqual({
      email: "events@example.com",
      name: "Event Radar",
    });
  });

  it("uses the configured sender name when set", () => {
    process.env.BREVO_SENDER_EMAIL = "events@example.com";
    process.env.BREVO_SENDER_NAME = "Friends Radar";
    expect(getBrevoSender()).toEqual({
      email: "events@example.com",
      name: "Friends Radar",
    });
  });
});
