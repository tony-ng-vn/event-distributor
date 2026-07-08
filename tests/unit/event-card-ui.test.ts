import { describe, expect, it } from "vitest";
import {
  REMOVE_INTEREST_LAYOUT_LABELS,
  REMOVE_INTEREST_LAYOUTS,
  getEventTitleHref,
} from "@/lib/event-card-ui";

describe("event-card-ui", () => {
  it("exposes three remove-interest layout options for preview", () => {
    expect(REMOVE_INTEREST_LAYOUTS).toEqual([
      "stacked",
      "inline-badge",
      "text-link",
    ]);
    expect(Object.keys(REMOVE_INTEREST_LAYOUT_LABELS)).toHaveLength(3);
  });

  it("getEventTitleHref returns null for missing or unsafe URLs", () => {
    expect(getEventTitleHref(null)).toBeNull();
    expect(getEventTitleHref("")).toBeNull();
    expect(getEventTitleHref("http://localhost/event")).toBeNull();
  });

  it("getEventTitleHref returns https event URLs", () => {
    expect(getEventTitleHref("https://lu.ma/chai-night")).toBe(
      "https://lu.ma/chai-night",
    );
  });
});
