/**
 * Route tests for the unsubscribe endpoint: GET must never mutate; the flip
 * happens only on POST with a valid token. DB layer is mocked.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const SECRET = "route-test-secret";
const disableEmailForUser = vi.fn<(userId: string) => Promise<void>>();

vi.mock("@/lib/notifications/config", () => ({
  getUnsubscribeSecret: () => SECRET,
}));
vi.mock("@/lib/notifications/preferences", () => ({
  disableEmailForUser: (userId: string) => disableEmailForUser(userId),
}));

import { GET, POST } from "@/app/api/notifications/unsubscribe/route";
import { signUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";

function url(token?: string) {
  const base = "https://app.example.com/api/notifications/unsubscribe";
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

describe("unsubscribe route", () => {
  beforeEach(() => {
    disableEmailForUser.mockClear();
  });

  it("GET with a valid token renders a confirmation form and does NOT mutate", async () => {
    const token = signUnsubscribeToken("user-1", SECRET);
    const response = GET(new Request(url(token)));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("method=\"post\"");
    expect(body).toContain("Confirm unsubscribe");
    expect(disableEmailForUser).not.toHaveBeenCalled();
  });

  it("GET with an invalid token shows an error and does NOT mutate", async () => {
    const response = GET(new Request(url("garbage")));
    expect(response.status).toBe(400);
    expect(disableEmailForUser).not.toHaveBeenCalled();
  });

  it("POST with a valid token flips email off", async () => {
    const token = signUnsubscribeToken("user-1", SECRET);
    const response = await POST(new Request(url(token), { method: "POST" }));

    expect(response.status).toBe(200);
    expect(disableEmailForUser).toHaveBeenCalledTimes(1);
    expect(disableEmailForUser).toHaveBeenCalledWith("user-1");
  });

  it("POST with a bad token does NOT mutate", async () => {
    const response = await POST(new Request(url("garbage"), { method: "POST" }));
    expect(response.status).toBe(400);
    expect(disableEmailForUser).not.toHaveBeenCalled();
  });

  it("POST with a missing token does NOT mutate", async () => {
    const response = await POST(new Request(url(), { method: "POST" }));
    expect(response.status).toBe(400);
    expect(disableEmailForUser).not.toHaveBeenCalled();
  });
});
