/**
 * Luma iCal calendar sync.
 *
 * A member connects their personal Luma iCal subscription URL once. We poll it,
 * harvest the lu.ma event URLs, and hand each to the existing ingest pipeline.
 *
 * Ingest is keyed on a unique luma_url, so re-syncing is naturally idempotent:
 * a known event throws "already in the feed", which counts as skipped, not
 * failed. That is why no per-feed cursor or "last seen" bookkeeping is needed.
 */
import { ingestLumaEvent } from "@/lib/events-service";
import { isEventSourceUrl, isLumaUrl } from "@/lib/event-page";

export type LumaSyncResult = {
  added: number;
  skipped: number;
  failed: number;
  /** Events left unchecked this run because the per-run cap was hit. */
  remaining?: number;
  /** Set only when the feed itself could not be fetched. */
  error?: string;
};

/**
 * Cap new ingests per run. Each new event triggers a live lu.ma scrape, and a
 * member with a long Luma history could otherwise exceed the serverless
 * function budget on first connect. Already-known events are a cheap DB check
 * (ingest rejects duplicates before scraping), so the cap only limits real
 * work; the stale-on-open re-sync picks up the remainder over later loads.
 */
const MAX_NEW_EVENTS_PER_SYNC = 20;

type SyncDeps = {
  fetchText?: (url: string) => Promise<string>;
  ingest?: (url: string, userId: string) => Promise<unknown>;
};

/** From a sync's point of view "already in the feed" is success, not an error. */
const ALREADY_IN_FEED = /already/i;

/**
 * Matches a lu.ma / luma.com link embedded anywhere in a line. The character
 * class excludes backslash because iCal escapes newlines as a literal "\n"
 * inside DESCRIPTION -- without this the match would run past the URL into the
 * escaped text.
 */
const LUMA_URL_PATTERN =
  /https?:\/\/(?:www\.)?(?:[a-z0-9-]+\.)*(?:lu\.ma|luma\.com)\/[^\s"'<>,;\\]+/gi;

/**
 * luma.com paths that are NOT event pages. Real feeds put "click to join" and
 * check-in links in DESCRIPTION and LOCATION next to the real event URL;
 * ingesting those would create duplicate or bogus feed entries.
 */
const NON_EVENT_SEGMENTS = new Set([
  "join",
  "check-in",
  "signin",
  "user",
  "u",
  "calendar",
]);

/**
 * Extract canonical lu.ma event-page URLs from an iCal document.
 *
 * Real Luma feeds do not use a URL: property -- the event link sits inside
 * DESCRIPTION, carries a ?pk= personal key, and shares the block with join/
 * check-in decoy links. So we scan every (unfolded) line for lu.ma links, drop
 * the non-event ones, and strip the query/hash to get a canonical, secret-free
 * URL that also dedupes cleanly. Only lu.ma hosts survive, so a tampered feed
 * cannot smuggle arbitrary URLs into ingest.
 */
export function parseLumaIcalUrls(icsText: string): string[] {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string) => {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return;
    }
    if (!isLumaUrl(parsed.toString())) return;

    const firstSegment = (parsed.pathname.split("/")[1] ?? "").toLowerCase();
    if (!firstSegment || NON_EVENT_SEGMENTS.has(firstSegment)) return;

    // Drop ?pk= (a per-user secret) and any hash: the public event page needs
    // neither, and keeping them would leak the key and defeat dedup.
    parsed.search = "";
    parsed.hash = "";
    const canonical = parsed.toString().replace(/\/$/, "");

    if (seen.has(canonical)) return;
    seen.add(canonical);
    urls.push(canonical);
  };

  for (const line of unfolded.split(/\r?\n/)) {
    const matches = line.match(LUMA_URL_PATTERN);
    if (matches) matches.forEach(add);
  }

  return urls;
}

/**
 * Whether a string is a Luma iCal feed URL we are willing to fetch server-side.
 * Accepts webcal:// (treated as https). Blocks non-Luma hosts and the usual
 * SSRF targets (private IPs, localhost, non-https) via isEventSourceUrl.
 */
export function isLumaIcalUrl(urlString: string): boolean {
  const https = toHttpsFeedUrl(urlString);
  return https !== null && isEventSourceUrl(https) && isLumaUrl(https);
}

/**
 * Normalize a feed URL to https. Luma hands the subscription link out as
 * webcal:// or http://; both are upgraded to https before the SSRF check, which
 * still requires the host to be Luma, so this cannot reach an internal target.
 */
function toHttpsFeedUrl(urlString: string): string | null {
  const trimmed = urlString.trim();
  if (!trimmed) return null;

  const upgraded = trimmed
    .replace(/^webcal:\/\//i, "https://")
    .replace(/^http:\/\//i, "https://");

  try {
    return new URL(upgraded).toString();
  } catch {
    return null;
  }
}

async function defaultFetchText(urlString: string): Promise<string> {
  const https = toHttpsFeedUrl(urlString);
  if (!https || !isLumaIcalUrl(https)) {
    throw new Error("Not a valid Luma iCal subscription URL");
  }

  const response = await fetch(https, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Luma feed returned ${response.status}`);
  }
  return response.text();
}

/**
 * Sync one member's Luma calendar into the shared feed.
 *
 * Failure-isolated by design: an unreachable feed returns an `error` result
 * (never throws, so it cannot break a feed load that triggered it), and a
 * single event that fails to ingest is counted and skipped over rather than
 * aborting the whole sync.
 */
export async function syncLumaCalendar(
  icsUrl: string,
  userId: string,
  deps: SyncDeps = {},
): Promise<LumaSyncResult> {
  const fetchText = deps.fetchText ?? defaultFetchText;
  const ingest = deps.ingest ?? ingestLumaEvent;

  let icsText: string;
  try {
    icsText = await fetchText(icsUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed unreachable";
    return { added: 0, skipped: 0, failed: 0, error: message };
  }

  const urls = parseLumaIcalUrls(icsText);
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i += 1) {
    if (added >= MAX_NEW_EVENTS_PER_SYNC) {
      return { added, skipped, failed, remaining: urls.length - i };
    }
    try {
      await ingest(urls[i], userId);
      added += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (ALREADY_IN_FEED.test(message)) skipped += 1;
      else failed += 1;
    }
  }

  return { added, skipped, failed };
}
