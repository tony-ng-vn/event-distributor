/** Unit tests for notification config, esp. the fail-loud base URL guard. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getAppBaseUrl,
  isEmailDeliveryEnabled,
} from "@/lib/notifications/config";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "APP_BASE_URL",
  "NOTIFICATIONS_EMAIL_ENABLED",
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
});
