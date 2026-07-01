/** Unit tests for Luma URL validation and HTML metadata parsing (cover images, titles). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isLumaUrl,
  normalizeLumaUrl,
  parseLumaHtml,
  resolveLumaEventHref,
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

  it("resolves outbound Luma links only for valid URLs", () => {
    expect(resolveLumaEventHref("https://lu.ma/demo-event")).toBe(
      "https://lu.ma/demo-event",
    );
    expect(resolveLumaEventHref("  https://lu.ma/demo-event  ")).toBe(
      "https://lu.ma/demo-event",
    );
    expect(resolveLumaEventHref("")).toBeNull();
    expect(resolveLumaEventHref(null)).toBeNull();
    expect(resolveLumaEventHref("https://example.com/event")).toBeNull();
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
