# Research: event-type corpus for filter + classifier

**Date:** 2026-07-11  
**Goal:** Ground a PRD for filtering the shared feed by event type, including how to classify events when types are not deterministic from keywords alone.  
**Related PRD:** [`../event-type-filter-and-classifier.md`](../event-type-filter-and-classifier.md)

---

## 1. What we can see in Event Radar today

### Schema (no type field)

`public.events` (from `migrations/20260701174826_create-event-radar-schema.sql`) stores:

| Column | Useful for typing? |
|--------|--------------------|
| `title` | Primary signal |
| `description` | Strong when present; often thin after OG scrape |
| `location` | Weak topic signal; strong for venue-format guesses |
| `is_online` | Orthogonal axis (format), already persisted |
| `host_name` | Weak but useful priors (e.g. athletic clubs vs VCs) |
| `luma_url` | Identity only; no Luma tags persisted |
| `start_at` / `end_at` | Duration/time-of-day heuristics only |

There is **no** `category`, `tags`, or `event_type` column. Feed filters today are response-state only (`all` / `pending` / `accepted`) plus calendar day — see `FeedFilter` in `src/types/feed.ts`.

### Live production dump (blocked in this environment)

This cloud agent run has **no** `.env.local` / `INSFORGE_API_KEY`, so a direct read of `https://yy57ijjh.us-east.insforge.app` `events` failed with `AUTH_INVALID_CREDENTIALS`. Prior agent runs on this repo hit the same gap.

`GET https://event-distributor.vercel.app/api/events` returns `401 AUTH_REQUIRED` (friends-only gate).

**Re-run locally (read-only):**

```bash
node --env-file=.env.local scripts/dump-event-type-corpus.mjs
```

Writes `docs/prd/research/prod-events-corpus.json`. Do not commit API keys. Prefer committing a **redacted** summary table (titles + proposed labels) rather than full descriptions if privacy is a concern.

### Indirect production signal

PR [#38](https://github.com/tony-ng-vn/event-distributor/pull/38) (Luma calendar sync) verified a **real 211-event personal Luma iCal feed**. Calendar sync is live, so production Event Radar is expected to contain a **diverse personal RSVP mix**, not only curated “AI meetup” pastes — volume and ambiguity will grow as more friends connect calendars (see also issue [#4](https://github.com/tony-ng-vn/event-distributor/issues/4)).

---

## 2. Proxy corpus: popular SF Luma events (2026-07-11)

Because prod was unreachable, we sampled Luma’s public SF discover page (`https://lu.ma/sf` / `https://luma.com/sf`) ItemList JSON-LD — **20 popular events**. Raw extract: [`luma-sf-proxy-corpus.json`](./luma-sf-proxy-corpus.json).

This is **not** the friend-group DB, but it matches the product domain (SF / Bay Area Luma culture the feed already targets).

### Titles in the sample

1. AI for Social Good: Hack with MLH & DigitalOcean  
2. The Computer Use Agents Hackathon by H Company  
3. World's Largest Hermes Buildathon | SF  
4. Fernanda Hosts Volleys & Vibes: WEEK 2  
5. Art & Us at SFMOMA  
6. 局部对齐 Local Alignment · AI×软硬件×桌游Mix聚会  
7. Founders Demo Day @ Corgi Cafe  
8. PXL ■ KIM ASENDORF  
9. hahahack | a hackathon for absurd + fun things w/ Codex  
10. How to Break into SF as an Immigrant Founder  
11. Rethinking Token Economics: A Conversation with …  
12. THE SF DATABASE MEETUP  
13. Show & Tell: AI for GTM @Notion …  
14. AI Philosophy Nights: Indifferent Intelligence  
15. late night creating cafe w/ Krea  
16. Poker Night  
17. World Cup Watch Party: Semi-finals  
18. Bay Area Frontier Research Club #14 … (dinner + paper discussion)  
19. Battle of the Paddles: AI Builders Edition  
20. ITCH - Businesses share what needs to be built  

### Naive keyword bucketing (why rules fail)

A quick regex pass over title/location/host produced multi-hit / unclear cases:

| Title | Keyword hits | Why hard |
|-------|--------------|----------|
| Battle of the Paddles: AI Builders Edition | ai_builders | Actually ping-pong social + brand; “AI” is garnish |
| Founders Demo Day @ Corgi Cafe | ai_builders + social | Both true; primary intent unclear |
| Local Alignment · AI×软硬件×桌游Mix聚会 | ai_builders | Mix of AI + hardware + board games |
| hahahack … w/ Codex | ai_builders + arts | Absurd/art hackathon |
| Poker Night | unclear | Pure social/games; no keyword |
| PXL ■ KIM ASENDORF | unclear | Gallery/show without “art” in title |
| Rethinking Token Economics… | unclear | Talk/VC fireside; needs “talk” semantics |
| AI for Social Good: Hack… | ai + social | “Social Good” ≠ social hangout |

**Takeaway:** SF Luma titles are playful, multi-intent, and brand-heavy. Deterministic keyword maps will systematically mis-label the interesting middle of the distribution — exactly the events friends argue about.

Rough bucket prevalence in this 20-event proxy (multi-label allowed): ~half AI/builders-skewed, with a long tail of sports, museum, cafe cowork, poker, watch parties, research dinners.

---

## 3. What “type” should mean for Event Radar

Friends filtering the feed are rarely asking for Eventbrite’s 40-tag ontology. They want coarse **intent filters**:

> “Show me hangouts / sports / art nights — hide another AI demo day.”

Recommended v1 taxonomy (closed set, single **primary** type + optional secondary):

| Type id | Friend-facing label | Includes |
|---------|---------------------|----------|
| `social` | Social | dinners, chai/coffee hangs, poker, watch parties, mixers, parties |
| `builders` | Builders / AI | hackathons, demo days, AI meetups, buildathons, ship nights |
| `talks` | Talks / learning | panels, firesides, research clubs, workshops, office hours |
| `sports` | Sports / fitness | volleyball, runs, climbs, paddle, gym |
| `arts` | Arts / culture | museum, gallery, music, comedy, creative cafes |
| `other` | Other | everything else / low confidence |

**Orthogonal (already in schema, do not overload “type”):**

- Online vs in-person (`is_online`)
- Response state (pending / interested)
- Time (calendar day)

**Multi-label vs primary:** many events are legitimately dual (`Founders Demo Day @ Cafe`). v1 should store:

- `primary_type` (required, used by filter pills)
- `secondary_types` (optional array, used for search/debug, not filter chips in v1)

Filter UX: selecting a type means `primary_type = X` **or** (optional later) `X in secondary_types`. Start with primary-only to keep pills honest.

---

## 4. Classifier options evaluated

| Approach | Fit for this corpus | Cost / ops | Verdict |
|----------|---------------------|------------|---------|
| **Manual tags at ingest** | Accurate | High friction; calendar sync auto-ingest breaks it | Reject as sole path |
| **Keyword / regex rules** | Fails on ambiguity & emoji/CJK titles | Cheap | Useful as **fallback only** |
| **Classical ML (embeddings + small model)** | Needs labeled set; N is small today | Training overhead | Overkill for v1 |
| **LLM structured classify at ingest** | Handles ambiguity, CJK, brand jokes | Per-ingest API call; InsForge AI gateway already in platform | **Recommended** |
| **Luma native tags API** | Would be ideal | Needs Luma Plus / calendar API; not available on scrape path | Watch for later |

### Recommended pipeline

```
ingest metadata (title, description, location, host, is_online)
        │
        ▼
 heuristic pre-label (optional; confidence hints)
        │
        ▼
 LLM classify → { primary, secondary[], confidence, rationale }
        │
        ▼
 if confidence < threshold → primary = other, flag needs_review
        │
        ▼
 persist on events row; expose in GET /api/events
        │
        ▼
 Feed filter pills (client) + optional server query filter later
```

**Backfill:** one-shot job over existing rows after column lands (same classifier).  
**Corrections:** admin (or later any approved user) can override `primary_type`; store `type_source = model|rules|human`.

### Why not wait for “perfect” taxonomy

Calendar sync + multi-source ingest ([#4](https://github.com/tony-ng-vn/event-distributor/issues/4)) will increase feed noise. Filtering by type is a **triage** feature; `other` + human override is acceptable. Taxonomy can widen later without changing the filter UX pattern.

---

## 5. Open questions for the human

1. Confirm the 6-type set (or collapse `talks` into `builders`).  
2. Provide `.env.local` (or re-run `scripts/dump-event-type-corpus.mjs`) so we can label the **real** prod corpus and spot-check the classifier before implementation.  
3. Single-select filter pills vs multi-select? (Recommend single-select + All for v1.)  
4. Should Pass’d events still be typed (yes — typing is event-global, not per-viewer).

---

## 6. Artifact checklist

- [x] Schema / current filter analysis  
- [x] Proxy SF corpus + failure cases for keywords  
- [x] Taxonomy proposal  
- [x] Classifier approach comparison  
- [x] Read-only dump script for prod  
- [ ] Prod event dump + hand labels (blocked on credentials)  
- [ ] Classifier prompt eval on prod titles (follows dump)
