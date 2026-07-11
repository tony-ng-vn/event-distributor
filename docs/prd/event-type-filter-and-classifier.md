# PRD: Event type filter + classifier

## Problem Statement

Event Radar’s shared feed mixes very different kinds of plans — AI hackathons, cafe hangouts, sports, museum nights, fireside chats — into one chronological list. As calendar sync and multi-source ingest grow the feed, friends cannot quickly answer “what’s social this week?” vs “what’s another builders night?” without reading every card.

Event metadata today has **no durable type**. Titles are playful and multi-intent, so hard-coded keyword rules mis-label too often to ship as the only system. Friends need a **small set of filterable types**, and the product needs a **classifier** that works on current Luma-scraped fields and stays maintainable as new events arrive.

## Goal

Ship:

1. A closed **event-type taxonomy** suited to this friend group’s SF/Bay Area Luma mix.  
2. A **classifier** that assigns a primary type (and optional secondary types) at ingest, with backfill for existing rows.  
3. **Feed filter UI** so an approved user can show All or one type.  

Research grounding: [`research/event-type-corpus-notes.md`](./research/event-type-corpus-notes.md).

## Solution

### Taxonomy (v1)

Single primary type per event:

| id | Label | Examples from research |
|----|-------|------------------------|
| `social` | Social | Poker Night, World Cup Watch Party, cafe hangs |
| `builders` | Builders / AI | Hackathons, buildathons, AI show-and-tells, demo days |
| `talks` | Talks / learning | Firesides, research club + paper discussion, panels |
| `sports` | Sports / fitness | Volleys & Vibes, paddle / run clubs |
| `arts` | Arts / culture | SFMOMA, gallery shows, creative nights |
| `other` | Other | Low-confidence or uncategorizable |

Online/in-person stays on `is_online` (separate filter later if needed — out of scope for v1 type pills).

### Classifier

At ingest (after metadata fetch, before or immediately after insert):

1. Build a short text packet: `title`, `description`, `location`, `host_name`, `is_online`.  
2. Call an LLM via the **InsForge AI gateway** (already part of the platform) with a strict JSON schema: `{ primary_type, secondary_types, confidence, rationale }`.  
3. Persist results on the event.  
4. If confidence &lt; threshold (suggested 0.55) or model unavailable → `primary_type = other`, `type_source = fallback`, keep rationale for debug.  
5. Optional cheap keyword hints may be passed *into* the prompt as suggestions, never as hard labels.

**Backfill:** admin-triggered or one-shot script classifies all existing events with null type.

**Override:** admin can set `primary_type` manually (`type_source = human`); model must not overwrite human labels on re-ingest/backfill unless forced.

### Feed filter

Extend the existing filter-pill pattern (`all` / `pending` / `accepted`) with a **second pill row** or a combined control for type:

- `All types` + one chip per taxonomy label (omit empty types or show count).  
- Client-side filter on loaded feed is enough for current feed sizes; server query param `?type=` can follow if lists grow.  
- Type is **global per event**, not per viewer (unlike Pass).

## User Stories

1. As a friend, I want to filter the feed to Social events, so I can find hangouts without scrolling past hackathons.  
2. As a friend, I want to filter to Builders / AI, so I can focus on shipping / demo nights.  
3. As a friend, I want to filter to Sports / fitness, so I can see games and active plans.  
4. As a friend, I want to filter to Arts / culture, so museum and creative nights are easy to find.  
5. As a friend, I want to filter to Talks / learning, so panels and research dinners surface together.  
6. As a friend, I want an Other bucket, so weird or unlabeled events are still reachable.  
7. As a friend, I want All types, so I can return to the full chronological feed.  
8. As a friend, I want type filters to compose with pending/interested and calendar day filters, so triage stays flexible.  
9. As a friend, I want the type of an event to be visible on the card (subtle label), so I understand why it matched a filter.  
10. As someone who pastes or syncs a Luma link, I want the event typed automatically, so I never pick a category by hand.  
11. As a member using calendar sync, I want auto-ingested events typed the same way as pasted ones, so the feed stays consistent.  
12. As an admin, I want to correct a wrong type, so one bad model call does not permanently mis-file an event.  
13. As an admin, I want to backfill types for events ingested before this feature, so historical cards become filterable.  
14. As a developer, I want classification to fail soft to `other`, so ingest never breaks because the model is down.  
15. As a developer, I want unit tests on taxonomy parsing and prompt JSON validation, so bad model output cannot corrupt rows.  
16. As a developer, I want a read-only corpus dump script, so we can evaluate the classifier on real titles before and after prompt changes.

## Implementation Decisions

### Data model

Add to `events` (migration):

- `primary_type text not null default 'other'` with check constraint on the closed set  
- `secondary_types text[] not null default '{}'`  
- `type_confidence real` (nullable)  
- `type_source text not null default 'untyped'` check in (`model`,`fallback`,`human`,`untyped`)  
- `type_rationale text` (nullable; debug / admin only — omit from public card JSON or truncate)  
- `typed_at timestamptz`  

Index: `events_primary_type_idx` on `primary_type`.

Serialize `primaryType` (+ optional `secondaryTypes`) on `FeedEvent` / `GET /api/events`.

### Service boundaries

- New pure module `src/lib/event-type-taxonomy.ts` — ids, labels, parse/validate.  
- New `src/lib/event-type-classifier.ts` — prompt + InsForge AI call + fallback rules.  
- Hook from `ingestLumaEvent` after metadata is known.  
- Backfill: `scripts/backfill-event-types.mjs` or admin API route (admin-only).  
- Dump: `scripts/dump-event-type-corpus.mjs` (research; already drafted).

### API / UI

- No new auth model — approved friends only, same as feed.  
- `FeedApp`: type pill state; partition helper filters by `primaryType`.  
- Card: small non-chip text or existing `tag-pill` style for the label (avoid noisy hero badges).  
- Admin correction: long-press/menu or admin detail control — minimal v1 can be a select on admin event card.

### Model ops

- Temperature low; JSON-only response; reject unknown ids.  
- Log failures; never block ingest.  
- Do not store full prompt logs with PII beyond event fields already in DB.  
- Re-classify on metadata refresh only if `type_source != human`.

### Testing

- Unit: taxonomy validation, JSON parse, confidence threshold → `other`.  
- Unit: classifier fallback when AI disabled (`EVENT_TYPE_CLASSIFIER=mock` or similar).  
- Integration: ingest persists `primary_type`; feed includes field.  
- Optional golden-file eval: 20–50 titled fixtures from corpus notes + prod dump once available.

## Out of Scope

- Personal per-user custom tags or “my labels.”  
- Luma Plus calendar tags API as source of truth.  
- Fine-tuned / local embedding model training.  
- Multi-select type filters and OR/AND query builders.  
- Filtering by host, neighborhood, or price.  
- Changing Accept / Pass / Star semantics.  
- Groups visibility model ([#30](https://github.com/tony-ng-vn/event-distributor/issues/30)).

## Research summary (executive)

- Prod DB dump was **not** available in the cloud agent (missing InsForge admin key); re-run dump script locally before implementation eval.  
- Proxy SF Luma popular list (20 events) is heavily builders-skewed with a long tail of social/sports/arts/talks — keyword rules fail on multi-intent and brand-joke titles.  
- Calendar sync implies production will look more like a **personal RSVP mix** than a curated AI-only feed.  
- Recommended approach: **LLM classifier + closed taxonomy + human override + soft failure to `other`**.

## Further Notes

- Before coding, label ~30 real prod titles into the taxonomy and measure mock-prompt accuracy; adjust labels (e.g. merge `talks` → `builders`) if confusion is high.  
- If InsForge AI is not enabled on the project yet, implementation should feature-flag the model path and ship fallback + human override first.  
- Suggested issue labels after human review: `needs-triage` → `ready-for-agent` once taxonomy is confirmed and a prod corpus sample is attached.
