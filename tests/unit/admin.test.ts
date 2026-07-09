/**
 * Unit tests for the admin-flag merge rule: the ADMIN_EMAILS allowlist only
 * ever grants admin on sync, never revokes a manually-set flag.
 */
import { describe, expect, it, afterEach } from "vitest";
import { resolveAdminFlag } from "@/lib/admin";

describe("resolveAdminFlag", () => {
  const original = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = original;
    }
  });

  it("grants admin when the email is on the allowlist, regardless of the existing flag", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(resolveAdminFlag("boss@example.com", false)).toBe(true);
    expect(resolveAdminFlag("boss@example.com", true)).toBe(true);
  });

  it("keeps a manually-granted admin flag even when the email is not on the allowlist", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(resolveAdminFlag("friend@example.com", true)).toBe(true);
  });

  it("stays false when neither the allowlist nor the existing flag grant admin", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(resolveAdminFlag("stranger@example.com", false)).toBe(false);
  });
});
