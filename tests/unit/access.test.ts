/**
 * Unit tests for pure email preapproval logic (no database).
 *
 * Preapproval lets the owner grant access to known friends who have not signed
 * up yet: admins are always in, plus anyone listed in APPROVED_EMAILS.
 */
import { describe, expect, it, afterEach } from "vitest";
import { getPreapprovedEmails, isEmailPreapproved } from "@/lib/access-service";

describe("email preapproval", () => {
  const originalApproved = process.env.APPROVED_EMAILS;
  const originalAdmin = process.env.ADMIN_EMAILS;

  afterEach(() => {
    process.env.APPROVED_EMAILS = originalApproved;
    process.env.ADMIN_EMAILS = originalAdmin;
  });

  it("preapproves admin emails, case-insensitively", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(isEmailPreapproved("boss@example.com")).toBe(true);
    expect(isEmailPreapproved("BOSS@Example.com")).toBe(true);
  });

  it("preapproves APPROVED_EMAILS entries, trimmed and case-insensitively", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    process.env.APPROVED_EMAILS = " friend@example.com , Other@Example.com ";

    expect(isEmailPreapproved("friend@example.com")).toBe(true);
    expect(isEmailPreapproved("other@example.com")).toBe(true);

    const list = getPreapprovedEmails();
    expect(list).toContain("boss@example.com");
    expect(list).toContain("friend@example.com");
    expect(list).toContain("other@example.com");
  });

  it("rejects unknown emails and blank input", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    delete process.env.APPROVED_EMAILS;

    expect(isEmailPreapproved("stranger@example.com")).toBe(false);
    expect(isEmailPreapproved("")).toBe(false);
    expect(isEmailPreapproved("   ")).toBe(false);
  });
});
