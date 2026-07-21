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
  /** Events dropped because they already happened (not ingested). */
  skippedPast?: number;
  /** Set only when the feed itself could not be fetched. */
  error?: string;
};

/** One event parsed from an iCal feed: its canonical URL and start/end (ms). */
export type LumaIcalEvent = {
  url: string;
  startsAt: number | null;
  endsAt: number | null;
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
  /** Injectable clock for deterministic past-event filtering in tests. */
  now?: number;
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
 * Canonicalize a raw lu.ma link, or null if it is not an event page.
 *
 * Real Luma feeds do not use a URL: property -- the event link sits inside
 * DESCRIPTION, carries a ?pk= personal key, and shares the block with join/
 * check-in decoy links. So we drop the non-event paths and strip the query/hash
 * to get a canonical, secret-free URL that also dedupes cleanly.
 */
function canonicalizeLumaUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (!isLumaUrl(parsed.toString())) return null;

  const firstSegment = (parsed.pathname.split("/")[1] ?? "").toLowerCase();
  if (!firstSegment || NON_EVENT_SEGMENTS.has(firstSegment)) return null;

  // Drop ?pk= (a per-user secret) and any hash; the public event page needs
  // neither, and keeping them would leak the key and defeat dedup.
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

/** Read a single iCal property value (handles ;params like TZID / VALUE=DATE). */
function matchIcalProp(block: string, name: string): string | null {
  const re = new RegExp(`^${name}(?:;[^:\\r\\n]*)?:(.+)$`, "im");
  const match = re.exec(block);
  return match ? match[1].trim() : null;
}

/**
 * Parse an iCal date/date-time to epoch ms. Handles `YYYYMMDDTHHMMSSZ`,
 * floating/`TZID` `YYYYMMDDTHHMMSS`, and all-day `YYYYMMDD`. Non-UTC forms are
 * read as UTC -- an approximation that is fine for past/future filtering, which
 * only cares about the day, not the exact minute.
 */
function parseIcalDate(raw: string | null): number | null {
  if (!raw) return null;
  const m = /(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/.exec(raw.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return Date.UTC(+y, +mo - 1, +d, +(h ?? 0), +(mi ?? 0), +(s ?? 0));
}

/**
 * Parse an iCal document into one entry per event, each with its canonical URL
 * and start/end. Splitting on VEVENT keeps every URL paired with its own dates
 * (needed to drop events that already happened). Globally de-duplicated.
 */
export function parseLumaIcalEvents(icsText: string): LumaIcalEvent[] {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
  const events: LumaIcalEvent[] = [];
  const seen = new Set<string>();

  for (const chunk of unfolded.split(/BEGIN:VEVENT/i).slice(1)) {
    const block = chunk.split(/END:VEVENT/i)[0] ?? "";
    const startsAt = parseIcalDate(matchIcalProp(block, "DTSTART"));
    const endsAt = parseIcalDate(matchIcalProp(block, "DTEND"));

    for (const line of block.split(/\r?\n/)) {
      const matches = line.match(LUMA_URL_PATTERN);
      if (!matches) continue;
      for (const raw of matches) {
        const url = canonicalizeLumaUrl(raw);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        events.push({ url, startsAt, endsAt });
      }
    }
  }

  return events;
}

/** Canonical lu.ma event-page URLs from an iCal document, in feed order. */
export function parseLumaIcalUrls(icsText: string): string[] {
  return parseLumaIcalEvents(icsText).map((event) => event.url);
}

/**
 * When an event has a start but no end time, assume it runs this long so a
 * just-started event is still treated as live instead of vanishing at its
 * start second. iCal feeds occasionally omit DTEND.
 */
const ASSUMED_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

/**
 * Whether an event has already fully ended as of `now`. Sync ingests only what
 * is still ahead: upcoming and currently-live events (end >= now) are kept, and
 * only events whose end time is already in the past are dropped. No backfill.
 */
function hasEnded(event: LumaIcalEvent, now: number): boolean {
  if (event.endsAt !== null) return event.endsAt < now;
  if (event.startsAt === null) return false; // unknown date -> keep, never drop
  // No end time: give the event an assumed duration so a live one is not cut
  // off the instant it begins.
  return event.startsAt + ASSUMED_EVENT_DURATION_MS < now;
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
  const now = deps.now ?? Date.now();

  let icsText: string;
  try {
    icsText = await fetchText(icsUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed unreachable";
    return { added: 0, skipped: 0, failed: 0, error: message };
  }

  // Drop events that already happened -- the shared feed is for planning ahead,
  // not a history of past RSVPs (a real feed is mostly old events).
  const events = parseLumaIcalEvents(icsText);
  const upcoming = events.filter((event) => !hasEnded(event, now));
  const skippedPast = events.length - upcoming.length;
  const urls = upcoming.map((event) => event.url);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i += 1) {
    if (added >= MAX_NEW_EVENTS_PER_SYNC) {
      return { added, skipped, failed, skippedPast, remaining: urls.length - i };
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

  return { added, skipped, failed, skippedPast };
}
