/**
 * Luma URL parsing and event metadata extraction.
 *
 * When someone pastes a lu.ma link, we fetch the HTML and pull out title, date,
 * cover image, etc. from JSON-LD and Open Graph tags (same data Luma puts in the page).
 *
 * LUMA_FETCH_MODE=mock returns fake data for local dev without network.
 *
 * Used by: events-service.ts (ingest + preview)
 */

/** True if the string looks like a Luma event URL (lu.ma or luma.com). */
export function isLumaUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const host = url.hostname.replace(/^www\./, "");
    return (
      host === "lu.ma" ||
      host === "luma.com" ||
      host.endsWith(".lu.ma") ||
      host.endsWith(".luma.com")
    );
  } catch {
    return false;
  }
}

/** Strip query/hash and trailing slash so duplicate URLs match the same event. */
export function normalizeLumaUrl(urlString: string): string {
  const url = new URL(urlString);
  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.replace(/^www\./, "");
  if (url.hostname === "luma.com" && !url.pathname.startsWith("/event/")) {
    // keep as-is for calendar pages etc.
  }
  return url.toString().replace(/\/$/, "");
}

export interface LumaMetadata {
  title: string;
  description: string;
  coverImageUrl: string | null;
  startAt: Date;
  endAt: Date;
  location: string;
  isOnline: boolean;
  meetingUrl: string | null;
  hostName: string | null;
}

/** Fake event returned when LUMA_FETCH_MODE=mock (tests + offline dev). */
const MOCK_METADATA: LumaMetadata = {
  title: "AI Builders Meetup",
  description: "Monthly gathering for people building with AI.",
  coverImageUrl: "https://images.lumacdn.com/cdn-cgi/image/format=auto,fit=cover,dpr=2,background=white,quality=75,width=400,height=400/event-covers/1/ai-meetup.jpg",
  startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
  location: "San Francisco, CA",
  isOnline: false,
  meetingUrl: null,
  hostName: "Community Host",
};

function extractJsonLdImage(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    for (const item of image) {
      const url = extractJsonLdImage(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof image === "object") {
    const record = image as Record<string, unknown>;
    if (typeof record.url === "string") return record.url;
    if (typeof record.contentUrl === "string") return record.contentUrl;
  }
  return null;
}

function normalizeImageUrl(
  url: string | null | undefined,
  baseUrl: string,
): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();
  try {
    if (trimmed.startsWith("//")) {
      return new URL(`https:${trimmed}`).href;
    }
    if (trimmed.startsWith("/")) {
      return new URL(trimmed, baseUrl).href;
    }
    return new URL(trimmed).href;
  } catch {
    return null;
  }
}

function extractLumacdnCoverUrl(html: string): string | null {
  const match = html.match(
    /https?:\/\/images\.lumacdn\.com\/[\w\-./=,%]+/i,
  );
  return match?.[0] ?? null;
}

function extractCoverImageUrl(
  html: string,
  baseUrl: string,
  jsonLdImage: string | null | undefined,
): string | null {
  const candidates = [
    jsonLdImage,
    getMetaContent(html, "og:image"),
    getMetaContent(html, "og:image:secure_url"),
    getMetaContent(html, "twitter:image"),
    getMetaContent(html, "twitter:image:src"),
    extractLumacdnCoverUrl(html),
  ];

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate, baseUrl);
    if (normalized) return normalized;
  }

  return null;
}

function parseJsonLdEvent(html: string): Partial<LumaMetadata> | null {
  const scripts = html.match(
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!scripts) return null;

  for (const script of scripts) {
    const jsonText = script
      .replace(/<script\b[^>]*>/i, "")
      .replace(/<\/script>/i, "")
      .trim();
    try {
      const data = JSON.parse(jsonText) as Record<string, unknown>;
      const event =
        data["@type"] === "Event"
          ? data
          : (data["@graph"] as Record<string, unknown>[] | undefined)?.find(
              (item) => item["@type"] === "Event",
            );
      if (!event) continue;

      const start = event.startDate ? new Date(String(event.startDate)) : null;
      const end = event.endDate
        ? new Date(String(event.endDate))
        : start
          ? new Date(start.getTime() + 2 * 60 * 60 * 1000)
          : null;

      const location = event.location as Record<string, unknown> | string | undefined;
      let locationStr = "";
      const isOnline = false;
      let meetingUrl: string | null = null;

      if (typeof location === "string") {
        locationStr = location;
      } else if (location && typeof location === "object") {
        locationStr = String(location.name ?? location.address ?? "");
        if (location.url) meetingUrl = String(location.url);
      }

      const organizer = event.organizer as Record<string, unknown> | undefined;

      return {
        title: String(event.name ?? ""),
        description: String(event.description ?? ""),
        coverImageUrl: extractJsonLdImage(event.image),
        startAt: start ?? undefined,
        endAt: end ?? undefined,
        location: locationStr,
        isOnline: isOnline || Boolean(meetingUrl),
        meetingUrl,
        hostName: organizer?.name ? String(organizer.name) : null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

function getMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Main parser — tries JSON-LD Event schema, then og: meta tags. */
export function parseLumaHtml(html: string, lumaUrl: string): LumaMetadata {
  const jsonLd = parseJsonLdEvent(html);
  const title =
    jsonLd?.title ||
    getMetaContent(html, "og:title") ||
    getMetaContent(html, "twitter:title") ||
    "Untitled Luma Event";
  const description =
    jsonLd?.description ||
    getMetaContent(html, "og:description") ||
    getMetaContent(html, "description") ||
    "";

  const coverImageUrl = extractCoverImageUrl(
    html,
    lumaUrl,
    jsonLd?.coverImageUrl,
  );

  const defaultStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const startAt = jsonLd?.startAt ?? defaultStart;
  const endAt =
    jsonLd?.endAt ?? new Date(startAt.getTime() + 2 * 60 * 60 * 1000);

  const location = jsonLd?.location || "";
  const meetingUrl = jsonLd?.meetingUrl ?? null;
  const isOnline =
    jsonLd?.isOnline ??
    (Boolean(meetingUrl) ||
      /online|virtual|zoom/i.test(location + description));

  return {
    title: title.replace(/\s*[|\-–—]\s*Luma\s*$/i, "").trim(),
    description,
    coverImageUrl,
    startAt,
    endAt,
    location,
    isOnline,
    meetingUrl,
    hostName: jsonLd?.hostName ?? null,
  };
}

/** Fetches lu.ma HTML (live) or returns MOCK_METADATA (mock mode). */
export async function fetchLumaMetadata(lumaUrl: string): Promise<LumaMetadata> {
  if (process.env.LUMA_FETCH_MODE === "mock") {
    return { ...MOCK_METADATA, startAt: new Date(MOCK_METADATA.startAt) };
  }

  const response = await fetch(lumaUrl, {
    headers: {
      "User-Agent": "EventDistributor/1.0 (+https://github.com/tony-ng-vn/event-distributor)",
      Accept: "text/html",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Could not fetch Luma page (${response.status})`);
  }

  const html = await response.text();
  return parseLumaHtml(html, lumaUrl);
}
