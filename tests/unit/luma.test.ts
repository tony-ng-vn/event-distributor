/** Unit tests for Luma URL validation and HTML metadata parsing (cover images, titles). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertRealEventPage,
  fetchEventMetadata,
  INVALID_EVENT_PAGE_MESSAGE,
  isEventSourceUrl,
  isLumaUrl,
  isValidEventPage,
  normalizeLumaUrl,
  normalizeSourceUrl,
  parseEventHtml,
  parseLumaHtml,
  resolveEventHref,
} from "@/lib/luma";

const fixturePath = join(process.cwd(), "tests/fixtures/luma-demo-head.html");

describe("luma URL helpers", () => {
  it("accepts lu.ma URLs", () => {
    expect(isLumaUrl("https://lu.ma/demo-event")).toBe(true);
    expect(isLumaUrl("https://luma.com/demo")).toBe(true);
    expect(isLumaUrl("https://example.com/event")).toBe(false);
  });

  it("normalizes Luma URLs for deduplication", () => {
    expect(normalizeLumaUrl("https://www.lu.ma/demo/?ref=abc#section")).toBe(
      "https://lu.ma/demo",
    );
    expect(normalizeLumaUrl("https://lu.ma/demo/")).toBe("https://lu.ma/demo");
  });

  it("accepts https event source URLs and rejects unsafe ones", () => {
    expect(
      isEventSourceUrl(
        "https://www.anthropic.com/webinars/voice-and-intelligence",
      ),
    ).toBe(true);
    expect(isEventSourceUrl("https://lu.ma/demo-event")).toBe(true);
    expect(isEventSourceUrl("http://example.com/event")).toBe(false);
    expect(isEventSourceUrl("javascript:alert(1)")).toBe(false);
    expect(isEventSourceUrl("https://localhost/event")).toBe(false);
    expect(isEventSourceUrl("https://127.0.0.1/event")).toBe(false);
    expect(isEventSourceUrl("https://192.168.1.1/event")).toBe(false);
    expect(isEventSourceUrl("not-a-url")).toBe(false);
  });

  it("normalizes generic source URLs for deduplication", () => {
    expect(
      normalizeSourceUrl(
        "https://www.anthropic.com/webinars/demo?utm_medium=email#section",
      ),
    ).toBe("https://anthropic.com/webinars/demo");
  });

  it("resolves outbound links for any valid event source URL", () => {
    expect(resolveEventHref("https://lu.ma/demo-event")).toBe(
      "https://lu.ma/demo-event",
    );
    expect(resolveEventHref("  https://lu.ma/demo-event  ")).toBe(
      "https://lu.ma/demo-event",
    );
    expect(
      resolveEventHref("https://www.anthropic.com/webinars/demo"),
    ).toBe("https://www.anthropic.com/webinars/demo");
    expect(resolveEventHref("")).toBeNull();
    expect(resolveEventHref(null)).toBeNull();
    expect(resolveEventHref("http://example.com/event")).toBeNull();
    expect(resolveEventHref("https://localhost/event")).toBeNull();
  });
});

describe("generic event HTML parsing", () => {
  it("parses Open Graph metadata from non-Luma pages", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Voice and Intelligence Webinar | Anthropic" />
          <meta property="og:description" content="Live demos and best practices." />
          <meta property="og:image" content="https://cdn.example.com/cover.png" />
        </head>
      </html>
    `;

    const metadata = parseEventHtml(
      html,
      "https://www.anthropic.com/webinars/voice-and-intelligence",
    );
    expect(metadata.title).toContain("Voice and Intelligence Webinar");
    expect(metadata.description).toContain("Live demos");
    expect(metadata.coverImageUrl).toBe("https://cdn.example.com/cover.png");
  });
});

describe("luma cover image extraction", () => {
  it("parses Open Graph metadata from HTML", () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Demo Night | Luma" />
          <meta property="og:description" content="A great event" />
          <meta property="og:image" content="https://example.com/cover.jpg" />
          <script type="application/ld+json">
            {"@type":"Event","name":"Demo Night","startDate":"2026-08-01T19:00:00.000Z","endDate":"2026-08-01T21:00:00.000Z","location":{"name":"SF"}}
          </script>
        </head>
      </html>
    `;

    const metadata = parseLumaHtml(html, "https://lu.ma/demo-night");
    expect(metadata.title).toContain("Demo Night");
    expect(metadata.coverImageUrl).toBe("https://example.com/cover.jpg");
    expect(metadata.location).toBe("SF");
  });

  it("extracts cover image from real Luma HTML with JSON-LD image arrays", () => {
    const html = readFileSync(fixturePath, "utf8");
    const metadata = parseLumaHtml(html, "https://lu.ma/demo");

    expect(metadata.coverImageUrl).toBe(
      "https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=1,anim=false,background=white,quality=75,width=1920,height=1920/event-covers/ub/4cf9793b-389d-4958-8a86-dd8ac71baee5",
    );
  });

  it("handles JSON-LD ImageObject cover images", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Event",
          "name": "ImageObject Event",
          "image": { "@type": "ImageObject", "url": "https://images.lumacdn.com/event-covers/test.jpg" },
          "startDate": "2026-08-01T19:00:00.000Z"
        }
      </script>
    `;

    const metadata = parseLumaHtml(html, "https://lu.ma/image-object");
    expect(metadata.coverImageUrl).toBe(
      "https://images.lumacdn.com/event-covers/test.jpg",
    );
  });

  it("normalizes protocol-relative and root-relative image URLs", () => {
    const html = `
      <meta property="og:image" content="//images.lumacdn.com/event-covers/relative.jpg" />
    `;

    const metadata = parseLumaHtml(html, "https://lu.ma/relative");
    expect(metadata.coverImageUrl).toBe(
      "https://images.lumacdn.com/event-covers/relative.jpg",
    );
  });

  it("falls back to lumacdn URLs embedded in page markup", () => {
    const html = `
      <link rel="preload" as="image" href="https://images.lumacdn.com/cdn-cgi/image/format=auto/event-covers/ub/fallback-id" />
    `;

    const metadata = parseLumaHtml(html, "https://lu.ma/fallback");
    expect(metadata.coverImageUrl).toBe(
      "https://images.lumacdn.com/cdn-cgi/image/format=auto/event-covers/ub/fallback-id",
    );
  });
});

describe("event page validation", () => {
  it("accepts real Luma event HTML with JSON-LD", () => {
    const html = readFileSync(fixturePath, "utf8");
    expect(isValidEventPage(html, "https://lu.ma/demo")).toBe(true);
    expect(() =>
      assertRealEventPage(html, "https://lu.ma/demo"),
    ).not.toThrow();
  });

  it("accepts Luma HTML with JSON-LD Event schema", () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Event","name":"Demo Night","startDate":"2026-08-01T19:00:00.000Z"}
      </script>
    `;
    expect(isValidEventPage(html, "https://lu.ma/demo-night")).toBe(true);
  });

  it("accepts non-Luma pages with strong Open Graph title", () => {
    const html = `
      <meta property="og:title" content="Voice and Intelligence Webinar | Anthropic" />
    `;
    expect(
      isValidEventPage(
        html,
        "https://www.anthropic.com/webinars/voice-and-intelligence",
      ),
    ).toBe(true);
  });

  it("accepts Luma pages with strong og:title when JSON-LD is missing", () => {
    const html = `
      <meta property="og:title" content="Demo Night | Luma" />
      <meta property="og:description" content="A great event" />
    `;
    expect(isValidEventPage(html, "https://lu.ma/demo-night")).toBe(true);
  });

  it("rejects empty or generic Luma pages", () => {
    const homepage = `
      <meta property="og:title" content="Luma" />
      <meta property="og:description" content="Discover events" />
    `;
    expect(isValidEventPage(homepage, "https://lu.ma/")).toBe(false);
    expect(() => assertRealEventPage(homepage, "https://lu.ma/")).toThrow(
      INVALID_EVENT_PAGE_MESSAGE,
    );
  });

  it("rejects pages that would only produce fallback metadata", () => {
    const bareHtml = "<html><head></head><body></body></html>";
    expect(isValidEventPage(bareHtml, "https://lu.ma/bogus-slug")).toBe(false);
    expect(() =>
      assertRealEventPage(bareHtml, "https://lu.ma/bogus-slug"),
    ).toThrow(INVALID_EVENT_PAGE_MESSAGE);
  });

  it("rejects random pages with empty og tags", () => {
    const html = `
      <meta property="og:title" content="" />
      <meta property="og:description" content="" />
    `;
    expect(isValidEventPage(html, "https://lu.ma/not-real")).toBe(false);
  });

  it("rejects 404-like pages", () => {
    const html = `
      <title>Page Not Found | Luma</title>
      <meta property="og:title" content="Page Not Found | Luma" />
    `;
    expect(isValidEventPage(html, "https://lu.ma/missing-event")).toBe(false);
  });

  it("rejects JSON-LD Event missing title or start date", () => {
    const missingTitle = `
      <script type="application/ld+json">
        {"@type":"Event","startDate":"2026-08-01T19:00:00.000Z"}
      </script>
    `;
    const missingDate = `
      <script type="application/ld+json">
        {"@type":"Event","name":"No Date Event"}
      </script>
    `;
    expect(isValidEventPage(missingTitle, "https://lu.ma/no-title")).toBe(
      false,
    );
    expect(isValidEventPage(missingDate, "https://lu.ma/no-date")).toBe(false);
  });
});

describe("fetchEventMetadata", () => {
  const originalMode = process.env.LUMA_FETCH_MODE;

  afterEach(() => {
    process.env.LUMA_FETCH_MODE = originalMode;
    vi.restoreAllMocks();
  });

  it("returns mock metadata without network in mock mode", async () => {
    process.env.LUMA_FETCH_MODE = "mock";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const metadata = await fetchEventMetadata("https://lu.ma/demo-ai-meetup");
    expect(metadata.title).toBe("AI Builders Meetup");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects invalid pages in live mode before parsing", async () => {
    process.env.LUMA_FETCH_MODE = "live";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "<html><head></head><body></body></html>",
      }),
    );

    await expect(fetchEventMetadata("https://lu.ma/bogus-slug")).rejects.toThrow(
      INVALID_EVENT_PAGE_MESSAGE,
    );
  });

  it("accepts valid pages in live mode", async () => {
    process.env.LUMA_FETCH_MODE = "live";
    const html = readFileSync(fixturePath, "utf8");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => html,
      }),
    );

    const metadata = await fetchEventMetadata("https://lu.ma/demo");
    expect(metadata.title).toBe("s4 -- demo day.");
  });
});
