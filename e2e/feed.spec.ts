/**
 * End-to-end browser tests — full app on port 3001 with E2E_TEST=true.
 * Uses /api/e2e/seed to reset DB; bypasses Clerk via x-e2e-user-id header.
 */
import { expect, test } from "@playwright/test";

const E2E_SECRET = "local-e2e-secret";

async function authenticatePage(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
) {
  const userRes = await request.put("/api/e2e/seed", {
    headers: {
      "x-e2e-secret": E2E_SECRET,
      "Content-Type": "application/json",
    },
    data: { email: "e2e@test.local", name: "E2E Tester" },
  });
  expect(userRes.ok()).toBeTruthy();
  const userBody = await userRes.json();
  const userId = userBody.user.id as string;

  await page.addInitScript(
    ({ viewerId, secret }) => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init = {}) => {
        const headers = new Headers(init.headers);
        headers.set("x-e2e-user-id", viewerId);
        headers.set("x-e2e-secret", secret);
        return originalFetch(input, { ...init, headers });
      };
    },
    { viewerId: userId, secret: E2E_SECRET },
  );

  return userId;
}

test.describe("shared Luma feed", () => {
  test.beforeEach(async ({ request }) => {
    const response = await request.delete("/api/e2e/seed", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
    expect(response.ok()).toBeTruthy();
  });

  async function waitForFeed(
    page: import("@playwright/test").Page,
    request: import("@playwright/test").APIRequestContext,
  ) {
    await authenticatePage(page, request);
    await page.goto("/");
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/events") && response.status() === 200,
    );
  }

  test("shows sign-in gate when not authenticated", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("sign-in-gate")).toBeVisible();
    await expect(page.getByTestId("empty-feed")).toBeHidden();
  });

  test("shows empty feed then seeded event", async ({ page, request }) => {
    await waitForFeed(page, request);
    await expect(page.getByTestId("empty-feed")).toBeVisible();

    const seed = await request.post("/api/e2e/seed", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
    expect(seed.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByTestId("feed-skeleton")).toBeHidden();
    await expect(page.getByRole("heading", { name: "AI Builders Meetup" })).toBeVisible();
    await expect(page.getByTestId("attendee-empty")).toBeVisible();
  });

  test("pass moves an event to past events locally", async ({ page, request }) => {
    await request.post("/api/e2e/seed", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });

    await waitForFeed(page, request);
    await expect(page.getByTestId("feed-new-events")).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI Builders Meetup" })).toBeVisible();

    const card = page.getByTestId(/event-card-/);
    await card.getByTestId("pass-button").click();
    await expect(page.getByTestId("feed-past-events")).toBeVisible();
    await expect(page.getByTestId("feed-new-events")).toBeHidden();
    await expect(page.getByRole("heading", { name: "AI Builders Meetup" })).toBeVisible();
  });

  test("ingests a Luma URL through the UI", async ({ page, request }) => {
    await waitForFeed(page, request);
    await page.getByTestId("add-luma-button").click();
    await page.getByTestId("luma-url-input").fill("https://lu.ma/playwright-event");
    await page.getByTestId("preview-button").click();
    await expect(page.getByTestId("ingest-modal")).toContainText("AI Builders Meetup");
    await page.getByTestId("add-event-button").click();
    await expect(page.getByRole("heading", { name: "AI Builders Meetup" })).toBeVisible();
  });

  test("your events is a top-level tab on desktop, not in the sidebar", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const seed = await request.post("/api/e2e/seed", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
    const seedBody = await seed.json();
    const eventId = seedBody.event.id as string;

    const userId = await authenticatePage(page, request);

    const accept = await request.post(`/api/events/${eventId}/accept`, {
      headers: {
        "x-e2e-secret": E2E_SECRET,
        "x-e2e-user-id": userId,
      },
    });
    expect(accept.ok()).toBeTruthy();

    await page.goto("/");
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/events") && response.status() === 200,
    );

    const aside = page.locator("aside");
    await expect(
      aside.getByRole("heading", { name: "Your events" }),
    ).toBeHidden();

    await page.getByTestId("tab-mine").click();
    await expect(page.getByTestId("your-events-tab")).toBeVisible();
    await expect(
      page.getByTestId("your-events-tab").getByText("AI Builders Meetup"),
    ).toBeVisible();
  });

  test("accept records attendee and shows interested state in UI", async ({
    page,
    request,
  }) => {
    const seed = await request.post("/api/e2e/seed", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
    const seedBody = await seed.json();
    const eventId = seedBody.event.id as string;

    const userId = await authenticatePage(page, request);

    const accept = await request.post(`/api/events/${eventId}/accept`, {
      headers: {
        "x-e2e-secret": E2E_SECRET,
        "x-e2e-user-id": userId,
      },
    });
    expect(accept.ok()).toBeTruthy();

    await page.goto("/");
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/events") && response.status() === 200,
    );
    await expect(page.getByTestId("accepted-state")).toBeVisible();
    await expect(page.getByText("1 interested")).toBeVisible();
  });

  test("unaccept removes interest and moves event back to new feed", async ({
    page,
    request,
  }) => {
    const seed = await request.post("/api/e2e/seed", {
      headers: { "x-e2e-secret": E2E_SECRET },
    });
    const seedBody = await seed.json();
    const eventId = seedBody.event.id as string;

    const userId = await authenticatePage(page, request);

    const accept = await request.post(`/api/events/${eventId}/accept`, {
      headers: {
        "x-e2e-secret": E2E_SECRET,
        "x-e2e-user-id": userId,
      },
    });
    expect(accept.ok()).toBeTruthy();

    await page.goto("/");
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/events") && response.status() === 200,
    );
    await expect(page.getByTestId("feed-past-events")).toBeVisible();
    await expect(page.getByTestId("accepted-state")).toBeVisible();

    const unaccept = await request.delete(`/api/events/${eventId}/accept`, {
      headers: {
        "x-e2e-secret": E2E_SECRET,
        "x-e2e-user-id": userId,
      },
    });
    expect(unaccept.ok()).toBeTruthy();

    await page.reload();
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/events") && response.status() === 200,
    );
    await expect(page.getByTestId("feed-new-events")).toBeVisible();
    await expect(page.getByTestId("accepted-state")).toBeHidden();
    await expect(page.getByTestId("accept-button")).toBeVisible();
  });
});
