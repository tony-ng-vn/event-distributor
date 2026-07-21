import { describe, expect, it } from "vitest";
import { isLiveEvent, isFeedVisibleRow } from "@/lib/event-status";

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("isLiveEvent", () => {
  it("is false before the event starts", () => {
    const event = {
      startAt: "2026-07-15T13:00:00.000Z",
      endAt: "2026-07-15T15:00:00.000Z",
    };
    expect(isLiveEvent(event, NOW)).toBe(false);
  });

  it("is true exactly at the start boundary", () => {
    const event = {
      startAt: "2026-07-15T12:00:00.000Z",
      endAt: "2026-07-15T15:00:00.000Z",
    };
    expect(isLiveEvent(event, NOW)).toBe(true);
  });

  it("is true while in progress", () => {
    const event = {
      startAt: "2026-07-15T11:00:00.000Z",
      endAt: "2026-07-15T15:00:00.000Z",
    };
    expect(isLiveEvent(event, NOW)).toBe(true);
  });

  it("is true exactly at the end boundary", () => {
    const event = {
      startAt: "2026-07-15T09:00:00.000Z",
      endAt: "2026-07-15T12:00:00.000Z",
    };
    expect(isLiveEvent(event, NOW)).toBe(true);
  });

  it("is false after the event has ended", () => {
    const event = {
      startAt: "2026-07-15T09:00:00.000Z",
      endAt: "2026-07-15T11:59:59.000Z",
    };
    expect(isLiveEvent(event, NOW)).toBe(false);
  });
});

describe("isFeedVisibleRow", () => {
  it("shows an upcoming event", () => {
    const row = { end_at: "2026-07-15T15:00:00.000Z", archived_at: null };
    expect(isFeedVisibleRow(row, NOW)).toBe(true);
  });

  it("shows a live event whose end is still in the future", () => {
    const row = { end_at: "2026-07-15T12:00:01.000Z", archived_at: null };
    expect(isFeedVisibleRow(row, NOW)).toBe(true);
  });

  it("keeps an event visible exactly at its end boundary", () => {
    const row = { end_at: "2026-07-15T12:00:00.000Z", archived_at: null };
    expect(isFeedVisibleRow(row, NOW)).toBe(true);
  });

  it("hides an event that has already ended", () => {
    const row = { end_at: "2026-07-15T11:59:59.000Z", archived_at: null };
    expect(isFeedVisibleRow(row, NOW)).toBe(false);
  });

  it("hides an archived event even when it has not ended yet", () => {
    const row = {
      end_at: "2026-07-15T15:00:00.000Z",
      archived_at: "2026-07-14T00:00:00.000Z",
    };
    expect(isFeedVisibleRow(row, NOW)).toBe(false);
  });
});
