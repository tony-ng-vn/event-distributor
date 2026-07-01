/** Unit tests for display name validation. */
import { describe, expect, it } from "vitest";
import { normalizeDisplayName } from "@/lib/auth-user";

describe("normalizeDisplayName", () => {
  it("trims whitespace", () => {
    expect(normalizeDisplayName("  Maya  ")).toBe("Maya");
  });

  it("rejects empty names", () => {
    expect(() => normalizeDisplayName("   ")).toThrow(/empty/i);
  });

  it("rejects names over 80 characters", () => {
    expect(() => normalizeDisplayName("a".repeat(81))).toThrow(/too long/i);
  });
});
