/** Unit tests for avatar initials and "Maya, Jordan and N others" copy. */
import { describe, expect, it } from "vitest";
import {
  formatAttendeeSummary,
  getAttendeeInitials,
} from "@/lib/attendees";

describe("formatAttendeeSummary", () => {
  it("returns empty-state copy when nobody is going", () => {
    expect(formatAttendeeSummary([], 0)).toBe("Be the first to go");
  });

  it("names two attendees and remaining count", () => {
    expect(
      formatAttendeeSummary(
        [{ name: "Maya" }, { name: "Jordan" }, { name: "Alex" }],
        7,
      ),
    ).toBe("Maya, Jordan and 5 others");
  });

  it("handles a single named attendee with overflow", () => {
    expect(formatAttendeeSummary([{ name: "Maya" }], 4)).toBe(
      "Maya and 3 others",
    );
  });
});

describe("getAttendeeInitials", () => {
  it("uses first letters from first and last name", () => {
    expect(getAttendeeInitials("Maya Kim")).toBe("MK");
  });

  it("falls back when name is missing", () => {
    expect(getAttendeeInitials(null)).toBe("?");
  });
});
