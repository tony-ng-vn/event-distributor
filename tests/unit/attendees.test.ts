/** Unit tests for avatar initials. */
import { describe, expect, it } from "vitest";
import { getAttendeeInitials } from "@/lib/attendees";

describe("getAttendeeInitials", () => {
  it("uses first letters from first and last name", () => {
    expect(getAttendeeInitials("Maya Kim")).toBe("MK");
  });

  it("falls back when name is missing", () => {
    expect(getAttendeeInitials(null)).toBe("?");
  });
});
