/**
 * Route tests for POST /api/cron/archive-finished. Auth is a bearer token from
 * CRON_SECRET; the archive service is mocked.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const archiveFinishedEvents = vi.fn();

vi.mock("@/lib/events-service", () => ({
  archiveFinishedEvents: (...args: unknown[]) => archiveFinishedEvents(...args),
}));

import { POST } from "@/app/api/cron/archive-finished/route";

function req(authorization?: string) {
  return new Request("https://app.example.com/api/cron/archive-finished", {
    method: "POST",
    ...(authorization ? { headers: { authorization } } : {}),
  });
}

describe("POST /api/cron/archive-finished", () => {
  beforeEach(() => {
    archiveFinishedEvents.mockReset();
    delete process.env.CRON_SECRET;
  });

  it("returns 503 when CRON_SECRET is unset", async () => {
    const response = await POST(req("Bearer anything"));
    expect(response.status).toBe(503);
    expect(archiveFinishedEvents).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token does not match", async () => {
    process.env.CRON_SECRET = "s3cret";
    const response = await POST(req("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(archiveFinishedEvents).not.toHaveBeenCalled();
  });

  it("returns 401 when the Authorization header is missing", async () => {
    process.env.CRON_SECRET = "s3cret";
    const response = await POST(req());
    expect(response.status).toBe(401);
    expect(archiveFinishedEvents).not.toHaveBeenCalled();
  });

  it("archives and returns the count for a valid token", async () => {
    process.env.CRON_SECRET = "s3cret";
    archiveFinishedEvents.mockResolvedValue(4);

    const response = await POST(req("Bearer s3cret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ archived: 4 });
    expect(archiveFinishedEvents).toHaveBeenCalledTimes(1);
  });
});
