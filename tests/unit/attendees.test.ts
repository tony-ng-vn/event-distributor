/** Unit tests for avatar initials and cross-event attendee dedup. */
import { describe, expect, it } from "vitest";
import { collectUniqueAttendees, getAttendeeInitials } from "@/lib/attendees";

describe("collectUniqueAttendees", () => {
  it("collapses duplicate ids across events, keeping first-seen order", () => {
    const maya = { id: "u1", name: "Maya", image: null };
    const jordan = { id: "u2", name: "Jordan", image: "j.png" };
    const events = [
      { attendees: [maya, jordan] },
      { attendees: [{ id: "u1", name: "Maya K", image: "m.png" }] },
      { attendees: [{ id: "u3", name: null, image: null }] },
    ];

    expect(collectUniqueAttendees(events)).toEqual([
      maya,
      jordan,
      { id: "u3", name: null, image: null },
    ]);
  });

  it("returns empty for no events", () => {
    expect(collectUniqueAttendees([])).toEqual([]);
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
