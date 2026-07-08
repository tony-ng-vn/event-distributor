import { describe, expect, it, vi } from "vitest";
import { openEventPage, runInterested } from "@/lib/interested-action";

describe("openEventPage", () => {
  it("opens the resolved event URL in a new tab with noopener,noreferrer", () => {
    const open = vi.fn();
    openEventPage({ lumaUrl: "https://lu.ma/chai-night" }, open);
    expect(open).toHaveBeenCalledWith(
      "https://lu.ma/chai-night",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("does nothing when the URL is missing or unsafe", () => {
    const open = vi.fn();
    openEventPage({ lumaUrl: null }, open);
    openEventPage({ lumaUrl: "" }, open);
    openEventPage({ lumaUrl: "http://localhost/event" }, open);
    expect(open).not.toHaveBeenCalled();
  });
});

describe("runInterested", () => {
  const event = { id: "e1", lumaUrl: "https://lu.ma/chai-night" };

  it("records interest and then opens the event page when accept succeeds", async () => {
    const accept = vi.fn().mockResolvedValue(true);
    const openPage = vi.fn();

    const recorded = await runInterested(event, {
      accept,
      openEventPage: openPage,
    });

    expect(accept).toHaveBeenCalledWith("e1");
    expect(openPage).toHaveBeenCalledWith(event);
    expect(recorded).toBe(true);
  });

  it("records interest but does NOT navigate when accept fails", async () => {
    const accept = vi.fn().mockResolvedValue(false);
    const openPage = vi.fn();

    const recorded = await runInterested(event, {
      accept,
      openEventPage: openPage,
    });

    expect(accept).toHaveBeenCalledWith("e1");
    expect(openPage).not.toHaveBeenCalled();
    expect(recorded).toBe(false);
  });
});
