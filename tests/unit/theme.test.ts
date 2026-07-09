/** Unit tests for the pure theme-resolution logic (no DOM, no localStorage). */
import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, isTheme, resolveInitialTheme } from "@/lib/theme";

describe("resolveInitialTheme", () => {
  it("uses the OS preference when there is no stored choice", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("an explicit stored choice overrides the OS preference", () => {
    expect(resolveInitialTheme("light", true)).toBe("light");
    expect(resolveInitialTheme("dark", false)).toBe("dark");
  });

  it("falls back to the OS preference for a garbage stored value", () => {
    expect(resolveInitialTheme("blue", true)).toBe("dark");
    expect(resolveInitialTheme("", false)).toBe("light");
  });
});

describe("isTheme", () => {
  it("accepts only the two known theme values", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("THEME_STORAGE_KEY", () => {
  it("is namespaced so it cannot collide with other app storage keys", () => {
    expect(THEME_STORAGE_KEY).toBe("event-distributor-theme");
  });
});
