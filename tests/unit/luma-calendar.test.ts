/**
 * Unit tests for Luma iCal calendar sync.
 *
 * The sync harvests lu.ma event URLs from a member's personal iCal feed and
 * hands each to the existing ingest pipeline. Dependencies (network fetch,
 * ingest) are injected so these tests stay deterministic -- no DB, no network.
 */
import { describe, it, expect } from "vitest";
import {
  isLumaIcalUrl,
  parseLumaIcalUrls,
  syncLumaCalendar,
} from "@/lib/luma-calendar";

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-1@lu.ma
SUMMARY:Demo Night
URL:https://lu.ma/demo-night
DTSTART:20260801T190000Z
END:VEVENT
BEGIN:VEVENT
UID:evt-2@lu.ma
SUMMARY:AI Meetup
URL:https://lu.ma/ai-meetup
END:VEVENT
END:VCALENDAR`;

describe("parseLumaIcalUrls", () => {
  it("extracts lu.ma event URLs from VEVENT blocks", () => {
    expect(parseLumaIcalUrls(SAMPLE_ICS)).toEqual([
      "https://lu.ma/demo-night",
      "https://lu.ma/ai-meetup",
    ]);
  });

  it("unfolds RFC 5545 folded lines before reading URLs", () => {
    // iCal wraps long lines with CRLF + a leading space/tab on the next line.
    const folded =
      "BEGIN:VEVENT\r\nURL:https://lu.ma/very-lo\r\n ng-slug\r\nEND:VEVENT";
    expect(parseLumaIcalUrls(folded)).toEqual(["https://lu.ma/very-long-slug"]);
  });

  it("reads URL properties that carry parameters", () => {
    const ics = "BEGIN:VEVENT\nURL;VALUE=URI:https://lu.ma/param-event\nEND:VEVENT";
    expect(parseLumaIcalUrls(ics)).toEqual(["https://lu.ma/param-event"]);
  });

  it("falls back to a lu.ma link in another field when URL: is absent", () => {
    // De-risks the unverified assumption that Luma always uses the URL: field.
    const ics =
      "BEGIN:VEVENT\nSUMMARY:Demo\nDESCRIPTION:Join us here https://lu.ma/desc-event more text\nEND:VEVENT";
    expect(parseLumaIcalUrls(ics)).toEqual(["https://lu.ma/desc-event"]);
  });

  it("prefers the URL: property over links elsewhere in the same event", () => {
    const ics =
      "BEGIN:VEVENT\nURL:https://lu.ma/canonical\nDESCRIPTION:mirror https://lu.ma/canonical\nEND:VEVENT";
    expect(parseLumaIcalUrls(ics)).toEqual(["https://lu.ma/canonical"]);
  });

  it("parses real Luma feed structure: unfolds, strips ?pk secret, drops join links", () => {
    // Modeled on a real Luma iCal feed: the event URL lives in DESCRIPTION
    // (not URL:), carries a ?pk= personal key, is folded mid-string, and sits
    // alongside luma.com/join/ decoy links in DESCRIPTION and LOCATION.
    const ics = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:evt-aaa@events.lu.ma",
      "SUMMARY:Pathways to Tech",
      "DESCRIPTION:Get up-to-date information at: https://luma.com/pathways2tech0",
      " 104?pk=g-secretkey123\\n\\nClick to join: https://luma.com/join/g-secretk",
      " ey123\\n\\nWelcome!",
      "LOCATION:https://luma.com/join/g-secretkey123",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:evt-bbb@events.lu.ma",
      "DESCRIPTION:Get up-to-date information at: https://luma.com/jyq7gu25?pk=g-abc",
      "LOCATION:650 California St",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    expect(parseLumaIcalUrls(ics)).toEqual([
      "https://luma.com/pathways2tech0104",
      "https://luma.com/jyq7gu25",
    ]);
  });

  it("ignores non-luma URLs (SSRF / junk guard)", () => {
    const ics = "BEGIN:VEVENT\nURL:https://evil.example.com/x\nEND:VEVENT";
    expect(parseLumaIcalUrls(ics)).toEqual([]);
  });

  it("de-duplicates repeated URLs within one feed", () => {
    const ics = `BEGIN:VEVENT\nURL:https://lu.ma/dupe\nEND:VEVENT\nBEGIN:VEVENT\nURL:https://lu.ma/dupe\nEND:VEVENT`;
    expect(parseLumaIcalUrls(ics)).toEqual(["https://lu.ma/dupe"]);
  });
});

describe("isLumaIcalUrl (feed-fetch SSRF guard)", () => {
  it("accepts https Luma feed URLs", () => {
    expect(isLumaIcalUrl("https://lu.ma/ics/get?key=abc")).toBe(true);
    expect(isLumaIcalUrl("https://api.lu.ma/ics/u/xyz")).toBe(true);
  });

  it("accepts webcal:// Luma URLs (treated as https)", () => {
    expect(isLumaIcalUrl("webcal://lu.ma/ics/get?key=abc")).toBe(true);
  });

  it("accepts http:// Luma feed URLs by upgrading to https", () => {
    // Luma hands out the subscription link as http://api.luma.com/ics/get?...
    expect(
      isLumaIcalUrl("http://api.luma.com/ics/get?entity=user&id=icssk-abc"),
    ).toBe(true);
  });

  it("rejects non-Luma hosts even over https", () => {
    expect(isLumaIcalUrl("https://evil.example.com/feed.ics")).toBe(false);
  });

  it("rejects SSRF targets: localhost, private IPs, and non-luma hosts", () => {
    // http:// is upgraded to https, but the host still must be Luma, so an
    // http link to a non-Luma or internal host is rejected after upgrade.
    expect(isLumaIcalUrl("http://evil.example.com/ics")).toBe(false);
    expect(isLumaIcalUrl("https://api.luma.com.evil.com/ics")).toBe(false);
    expect(isLumaIcalUrl("https://localhost/ics")).toBe(false);
    expect(isLumaIcalUrl("https://127.0.0.1/ics")).toBe(false);
    expect(isLumaIcalUrl("https://192.168.1.1/ics")).toBe(false);
    expect(isLumaIcalUrl("not-a-url")).toBe(false);
  });
});

describe("syncLumaCalendar", () => {
  it("ingests every event attributed to the given user", async () => {
    const calls: Array<[string, string]> = [];
    const result = await syncLumaCalendar("https://lu.ma/ics/u/abc", "user-1", {
      fetchText: async () => SAMPLE_ICS,
      ingest: async (url, userId) => {
        calls.push([url, userId]);
      },
    });

    expect(calls).toEqual([
      ["https://lu.ma/demo-night", "user-1"],
      ["https://lu.ma/ai-meetup", "user-1"],
    ]);
    expect(result).toMatchObject({ added: 2, skipped: 0, failed: 0 });
  });

  it("counts already-in-feed events as skipped, not failed (second run / dedup)", async () => {
    const result = await syncLumaCalendar("https://lu.ma/ics/u/abc", "user-1", {
      fetchText: async () => SAMPLE_ICS,
      ingest: async () => {
        throw new Error("This event is already in the feed");
      },
    });

    expect(result).toMatchObject({ added: 0, skipped: 2, failed: 0 });
  });

  it("keeps going when one event fails and reports the failure count", async () => {
    let n = 0;
    const result = await syncLumaCalendar("https://lu.ma/ics/u/abc", "user-1", {
      fetchText: async () => SAMPLE_ICS,
      ingest: async () => {
        n += 1;
        if (n === 1) throw new Error("scrape timed out");
      },
    });

    expect(result).toMatchObject({ added: 1, skipped: 0, failed: 1 });
  });

  it("caps new ingests per run and reports the remainder", async () => {
    // 25 distinct events; the cap is 20, so 5 should be left for a later run.
    const events = Array.from(
      { length: 25 },
      (_, i) => `BEGIN:VEVENT\nURL:https://lu.ma/evt-${i}\nEND:VEVENT`,
    ).join("\n");
    const ics = `BEGIN:VCALENDAR\n${events}\nEND:VCALENDAR`;

    let ingested = 0;
    const result = await syncLumaCalendar("https://lu.ma/ics/u/abc", "user-1", {
      fetchText: async () => ics,
      ingest: async () => {
        ingested += 1;
      },
    });

    expect(ingested).toBe(20);
    expect(result).toMatchObject({ added: 20, remaining: 5 });
  });

  it("does not throw when the feed is unreachable", async () => {
    const result = await syncLumaCalendar("https://lu.ma/ics/u/abc", "user-1", {
      fetchText: async () => {
        throw new Error("network down");
      },
      ingest: async () => {},
    });

    expect(result.added).toBe(0);
    expect(result.error).toBeTruthy();
  });
});
