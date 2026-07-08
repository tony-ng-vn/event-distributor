/** Unit tests for signed, login-free unsubscribe tokens. */
import { describe, expect, it } from "vitest";
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/notifications/unsubscribe-token";

const SECRET = "test-secret-value";

describe("unsubscribe tokens", () => {
  it("round-trips a signed user id", () => {
    const token = signUnsubscribeToken("user-123", SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toBe("user-123");
  });

  it("preserves ids with unusual characters", () => {
    const id = "user.with+odd/chars=";
    const token = signUnsubscribeToken(id, SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toBe(id);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signUnsubscribeToken("user-123", SECRET);
    expect(verifyUnsubscribeToken(token, "other-secret")).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = signUnsubscribeToken("user-123", SECRET);
    const [, signature] = token.split(".");
    const forged = `${Buffer.from("user-999").toString("base64url")}.${signature}`;
    expect(verifyUnsubscribeToken(forged, SECRET)).toBeNull();
  });

  it("returns null for malformed or empty input", () => {
    expect(verifyUnsubscribeToken("", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("nodot", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("a.b.c", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("valid.token", "")).toBeNull();
  });

  it("refuses to sign without a secret", () => {
    expect(() => signUnsubscribeToken("user-123", "")).toThrow(/secret/i);
  });
});
