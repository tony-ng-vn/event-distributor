/** Unit tests for avatar initials and "Maya, Jordan and N others" copy. */
import { describe, expect, it } from "vitest";
import {
  formatAttendeeSummary,
  formatPassSummary,
  getAttendeeInitials,
} from "@/lib/attendees";

describe("formatAttendeeSummary", () => {
  it("returns empty-state copy when nobody is interested", () => {
    expect(formatAttendeeSummary([], 0)).toBe("Be the first to say you're in");
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

describe("formatPassSummary", () => {
  it("returns subtle empty-state copy when nobody passed", () => {
    expect(formatPassSummary([], 0)).toBe("Nobody passed yet");
  });

  it("names two passers and remaining count", () => {
    expect(
      formatPassSummary(
        [{ name: "Sam" }, { name: "Riley" }, { name: "Alex" }],
        5,
      ),
    ).toBe("Sam, Riley and 3 others");
  });

  it("handles count-only when names are missing", () => {
    expect(formatPassSummary([{ name: null }], 2)).toBe("2 passed");
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
