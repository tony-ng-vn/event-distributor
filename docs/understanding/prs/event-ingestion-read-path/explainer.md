# How the app reads a Luma (or any) event link

**Scope:** subsystem explainer -- event ingestion read path (code as on main) -- traces commits `78bad2f`, `d72ecde`, `064fcc2`
**If you only read one section, read [Intuition](#intuition).**

---

## At a glance

When you paste an event URL, the app fetches that public web page server-side and lifts the event's title, date, location, host, and cover image out of the page's own machine-readable metadata (JSON-LD, then Open Graph tags).
No Luma or Partiful private API is involved.

---

## Background

### Deep background (skip if familiar)

Two web standards do all the heavy lifting.

**JSON-LD** (JavaScript Object Notation for Linked Data) is a block of JSON a site embeds in a `<script type="application/ld+json">` tag to describe its content in a machine-readable way.
When it follows the *schema.org/Event* shape it hands us `name`, `startDate`, `location`, `organizer` and more, already structured.

**Open Graph** (the `og:title`, `og:image` ... `<meta>` tags you see in link previews) is the weaker fallback.
It always gives a title and image but has no real notion of a date or a venue.

Luma and Partiful both emit these tags for their own SEO and link-preview cards, which is the entire reason this app can read them with zero platform integration.

### What mattered before this change

The whole read path lives in one file, `src/lib/luma.ts` (the name is legacy -- it parses any event page, not just Luma).
It is called by `ingestLumaEvent` in `src/lib/events-service.ts`, reached from the POST route `src/app/api/events/ingest/route.ts` when the "Share an event" modal submits a URL.
Nothing here scrapes attendee lists -- RSVP/accept counts are an in-app concept in our own `accepts` table, never read from the source site.

---

## Intuition

**Goal:** paste an event URL, get back a clean structured event we can store and show, and reject anything that is not really an event page.

**Read this first, it corrects a common misconception:** there is no "Partiful reader" and no "Luma reader" in this codebase.
There is one generic reader.
Per `docs/adr/0001` the MVP is Luma-only, and the single platform-specific line of code is `isLumaUrl()`, used purely to strip a trailing " | Luma" from titles.

A Partiful link is not handled by a dedicated parser -- it flows through the exact same generic JSON-LD / Open-Graph scrape as any other site, and that path is not covered by tests.
So "the site can read Partiful" really means "Partiful pages happen to expose standard event metadata that our generic reader can pick up."

The mental model: we act like a link-preview bot.
We fetch the page a human would see, read the structured hints the page publishes about itself, and prefer the richest hint available -- JSON-LD first (it carries real dates and a venue), Open Graph second (only a title and image are reliable), hardcoded defaults last so the pipeline never crashes on a thin page.

```
paste URL -> guard + normalize -> fetch HTML -> JSON-LD / OG parse -> validity gate -> Postgres row
```

---

## Code walkthrough

### Step 1 -- Guard and normalize the URL before touching the network

Before any fetch, `isEventSourceUrl` enforces https-only and blocks localhost and private IP ranges.
This is an **SSRF guard** (server-side request forgery: stopping a user from tricking our server into fetching internal addresses like `169.254.169.254`).
Then `normalizeSourceUrl` strips query, hash, `www.`, and trailing slash so the same event pasted two ways deduplicates to one row.

```typescript
// src/lib/luma.ts:46
export function isEventSourceUrl(urlString: string): boolean {
  const url = new URL(urlString.trim());
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return false;   // localhost, 127.0.0.1, ...
  if (isPrivateIpv4(host)) return false;        // 10./172.16-31./192.168./169.254.
  return true;
}
```

### Step 2 -- Fetch the page HTML server-side

`fetchEventMetadata` does a plain server-side `fetch` with our own User-Agent -- no headless browser, no oEmbed, no platform API.
`LUMA_FETCH_MODE=mock` short-circuits this with fake data so tests and offline dev never hit the network.

```typescript
// src/lib/luma.ts:390
const response = await fetch(sourceUrl, {
  headers: { "User-Agent": "EventDistributor/1.0 ...", Accept: "text/html" },
  next: { revalidate: 0 },
});
const html = await response.text();
assertRealEventPage(html, sourceUrl);   // the validity gate, see step 5
return parseEventHtml(html, sourceUrl);
```

### Step 3 -- Prefer JSON-LD schema.org Event (the rich source)

`parseJsonLdEvent` regex-matches every `<script type="application/ld+json">` block, `JSON.parse`s it, and picks the object whose `@type` is `"Event"` (or one nested in an `@graph` array).
From that object it reads title, description, start/end dates, location, an optional meeting URL, the organizer name, and the cover image.
Note this is **regex over raw HTML, not a DOM parser** -- fast and dependency-free, but brittle if a platform changes its markup.

```typescript
// src/lib/luma.ts:191
const event =
  data["@type"] === "Event"
    ? data
    : (data["@graph"] as Record<string, unknown>[])?.find(
        (item) => item["@type"] === "Event",
      );
```

### Step 4 -- Fall back to Open Graph, then to defaults

`parseEventHtml` is the ladder: JSON-LD value if present, else an Open Graph / Twitter meta tag via `getMetaContent`, else a hardcoded default (title "Untitled Event", start = 7 days out).

```typescript
// src/lib/luma.ts:274
const title =
  jsonLd?.title ||
  getMetaContent(html, "og:title") ||
  getMetaContent(html, "twitter:title") ||
  defaultTitle;
// isLumaUrl() is the ONLY platform-specific branch, and it is cosmetic:
const cleanedTitle = isLumaUrl(sourceUrl)
  ? title.replace(/\s*[|\-]\s*Luma\s*$/i, "").trim()
  : title.trim();
```

### Step 5 -- Reject pages that are not real events

`assertRealEventPage` stops someone pasting a random homepage and getting a garbage event.
It accepts the page only if it has genuine JSON-LD Event signals (title AND valid start date) OR a strong, non-placeholder Open Graph title (it rejects "Luma", "Not Found", "404").

```typescript
// src/lib/luma.ts:377
export function isValidEventPage(html: string, sourceUrl: string): boolean {
  if (hasJsonLdEventSignals(html)) return true;        // title + valid startDate
  return hasStrongOpenGraphSignals(html, sourceUrl);   // real, non-placeholder title
}
```

### Step 6 -- Normalize into one shape and persist

The parser returns a `LumaMetadata` object (again, legacy name for a generic event).
`ingestLumaEvent` checks the events table for the same normalized URL (`luma_url` is `unique`), throws "already in the feed" if found, else inserts one snake_case row.

**Trap for future readers:** the type `LumaMetadata`, the column `luma_url`, and the field `lumaUrl` all hold ANY event URL, not only Luma ones.

```typescript
// src/lib/events-service.ts:258
const normalized = normalizeSourceUrl(lumaUrl);
const { data: existing } = await db.database
  .from("events").select("id").eq("luma_url", normalized).maybeSingle();
if (existing) throw new Error("This event is already in the feed");
const metadata = await fetchEventMetadata(normalized);
```

---

## Quiz

Answer without peeking. Each question has one best answer.

### 1. Where does the app primarily get an event's title, date, and location from?

- [ ] Luma's and Partiful's official REST APIs
  <details><summary>Reveal</summary>Wrong -- no platform API is called. The app only fetches the public HTML the page serves.</details>
- [ ] The page's own JSON-LD schema.org Event block, falling back to Open Graph meta tags
  <details><summary>Reveal</summary>Correct -- parseJsonLdEvent reads the JSON-LD Event first, parseEventHtml falls back to og:/twitter: tags per field.</details>
- [ ] A headless browser that renders the page and reads the DOM
  <details><summary>Reveal</summary>Wrong -- there is no headless browser. It is a plain fetch plus regex over the HTML string.</details>
- [ ] The URL path and query string
  <details><summary>Reveal</summary>Wrong -- the URL is only guarded and normalized; the data comes from the page body.</details>

### 2. How much Partiful-specific code is in the ingestion path?

- [ ] A dedicated Partiful parser mirroring the Luma one
  <details><summary>Reveal</summary>Wrong -- there is no Partiful parser. The ADR scopes the MVP to Luma only.</details>
- [ ] A Partiful API client with an auth token
  <details><summary>Reveal</summary>Wrong -- no platform API clients exist here at all.</details>
- [ ] A Partiful branch inside parseJsonLdEvent
  <details><summary>Reveal</summary>Wrong -- parseJsonLdEvent is entirely platform-agnostic.</details>
- [ ] None -- a Partiful link flows through the same generic reader as any site
  <details><summary>Reveal</summary>Correct -- Partiful "works" only because its pages expose standard event metadata; that path is generic and untested.</details>

### 3. What is `isLumaUrl()` actually used for in the read path?

- [ ] Deciding whether to call the Luma API
  <details><summary>Reveal</summary>Wrong -- no Luma API is ever called.</details>
- [ ] Blocking non-Luma URLs from being ingested
  <details><summary>Reveal</summary>Wrong -- isEventSourceUrl accepts any public https host; non-Luma URLs are allowed.</details>
- [ ] Cosmetic title cleanup (stripping a trailing " | Luma") and picking a default title
  <details><summary>Reveal</summary>Correct -- it is the only platform branch and it only tidies the title.</details>
- [ ] Choosing a different HTTP User-Agent
  <details><summary>Reveal</summary>Wrong -- the User-Agent is the same for every URL.</details>

### 4. What does `assertRealEventPage` prevent?

- [ ] Saving a random non-event page (like a homepage or a 404) as a bogus event
  <details><summary>Reveal</summary>Correct -- it requires real JSON-LD Event signals or a strong, non-placeholder Open Graph title.</details>
- [ ] Fetching URLs that point at internal/private IP addresses
  <details><summary>Reveal</summary>Wrong -- that is isEventSourceUrl (the SSRF guard), a separate earlier check.</details>
- [ ] Two users adding the same event twice
  <details><summary>Reveal</summary>Wrong -- deduplication is the unique luma_url check in ingestLumaEvent.</details>
- [ ] Storing an event whose date is in the past
  <details><summary>Reveal</summary>Wrong -- there is no past-date rejection in the read path.</details>

### 5. The database column is named `luma_url`. What does it actually hold?

- [ ] Only lu.ma and luma.com URLs; other hosts are rejected
  <details><summary>Reveal</summary>Wrong -- the ingest path accepts any public https event URL.</details>
- [ ] The Luma internal event ID, not a URL
  <details><summary>Reveal</summary>Wrong -- it stores the full normalized URL string.</details>
- [ ] Any normalized https event URL -- the name is legacy, not a constraint
  <details><summary>Reveal</summary>Correct -- LumaMetadata, luma_url, and lumaUrl are all legacy names that hold any event URL.</details>
- [ ] A shortened redirect link generated by the app
  <details><summary>Reveal</summary>Wrong -- the app stores the source URL as-is after normalization.</details>
