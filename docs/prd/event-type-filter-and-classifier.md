# PRD: Event type filter + classifier

**GitHub issue:** [#46](https://github.com/tony-ng-vn/event-distributor/issues/46)  
**Research:** [`research/event-type-corpus-notes.md`](./research/event-type-corpus-notes.md)

## Problem Statement

Event Radar’s shared feed mixes very different kinds of plans — AI hackathons, cafe hangouts, sports, museum nights, fireside chats — into one chronological list. As calendar sync and multi-source ingest grow the feed, friends cannot quickly answer “what’s social this week?” vs “what’s another builders night?” without reading every card.

Event metadata today has **no durable type**. Titles are playful and multi-intent, so hard-coded keyword rules mis-label too often to ship as the only system. Friends need a **small set of filterable types**, and the product needs a **classifier** that works on current Luma-scraped fields and stays maintainable as new events arrive.

## Goal

Ship:

1. A closed **event-type taxonomy** suited to this friend group’s SF/Bay Area Luma mix.  
2. A **classifier** that assigns a primary type (and optional secondary types) after ingest, with backfill for existing rows.  
3. **Feed filter UI** so an approved user can show All or one type.

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

**Insert first, classify async.** Calendar sync can ingest many URLs in one request; the LLM must not sit on the ingest critical path (same spirit as post-write notification emit).

1. `ingestLumaEvent` inserts the row with `primary_type = other`, `type_source = untyped`.  
2. After a successful insert (and for backfill batches), enqueue or fire-and-forget classification — never fail ingest if the model errors.  
3. Classifier builds a short text packet: `title`, `description`, `location`, `host_name`, `is_online`.  
4. Call an LLM via the **InsForge AI gateway** when enabled (`EVENT_TYPE_CLASSIFIER=insforge` or equivalent). Until that call shape is verified in this project, default to `EVENT_TYPE_CLASSIFIER=mock|off` and leave rows `untyped` / rules-fallback.  
5. Strict JSON schema: `{ primary_type, secondary_types, confidence, rationale }`. Reject unknown ids.  
6. If confidence &lt; threshold (suggested 0.55) or model unavailable → set `primary_type = other`, `type_source = fallback` (rules or soft-fail).  
7. Optional keyword hints may be passed *into* the prompt as suggestions, never as hard labels. Keyword-only assignment (no model) uses `type_source = rules`.

**Backfill:** admin-triggered or one-shot script classifies rows where `type_source = untyped` (not “null type” — `primary_type` is always non-null).

**Override:** admin can set `primary_type` manually (`type_source = human`); model/backfill must not overwrite human labels unless an explicit force flag is passed.

**v1 triggers only:** (1) post-ingest async classify, (2) backfill script/admin job, (3) admin override. There is no metadata-refresh reclassify path today (ingest is insert-once / dedupe-by-URL); do not invent one in v1.

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
8. As a friend, I want type filters to compose with pending/accepted and calendar day filters, so triage stays flexible.  
9. As a friend, I want the type of an event to be visible on the card (subtle label), so I understand why it matched a filter.  
10. As someone who pastes or syncs a Luma link, I want the event typed automatically soon after it appears, so I never pick a category by hand.  
11. As a member using calendar sync, I want auto-ingested events typed the same way as pasted ones, so the feed stays consistent.  
12. As a friend, I want events that are still classifying to stay under All (and not falsely inflate Other), so Other means “we looked and could not type it.”  
13. As an admin, I want to correct a wrong type, so one bad model call does not permanently mis-file an event.  
14. As an admin, I want to backfill types for events ingested before this feature, so historical cards become filterable.  
15. As a developer, I want classification to fail soft without blocking ingest, so calendar sync never times out on the model.  
16. As a developer, I want unit tests on taxonomy parsing and prompt JSON validation, so bad model output cannot corrupt rows.  
17. As a developer, I want a read-only corpus dump script, so we can evaluate the classifier on real titles before and after prompt changes.

## Implementation Decisions

### Data model

Add to `events` (migration):

- `primary_type text not null default 'other'` with check constraint on the closed set  
- `secondary_types text[] not null default '{}'`  
- `type_confidence real` (nullable)  
- `type_source text not null default 'untyped'` with check in (`untyped`,`model`,`rules`,`fallback`,`human`)  
- `type_rationale text` (nullable; debug / admin only — omit from public card JSON or truncate)  
- `typed_at timestamptz` (nullable until first successful classify or human override)

**Semantics (important):**

| `type_source` | Meaning | Feed “Other” pill |
|---------------|---------|-------------------|
| `untyped` | Not classified yet (just ingested / backfill pending) | **Exclude** — only visible under All |
| `model` | LLM assigned a type (may be `other` if model chose it) | Include when `primary_type = other` |
| `rules` | Keyword fallback assigned a type without LLM | Include when `primary_type = other` |
| `fallback` | Soft-fail / low confidence → forced `other` | Include |
| `human` | Admin override | Include when `primary_type = other` |

So: `primary_type` is always non-null for simple filtering code, but **Other ≠ untyped**. Untyped rows wait in All until classified.

Index: `events_primary_type_idx` on `primary_type`; optional partial index on `type_source = 'untyped'` for backfill scans.

Serialize `primaryType`, `typeSource`, and optional `secondaryTypes` on `FeedEvent` / `GET /api/events`.

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
- Log failures; never block ingest or calendar sync.  
- Do not store full prompt logs with PII beyond event fields already in DB.  
- No automatic reclassify loop in v1 (no metadata-refresh path). Human override and backfill are the correction paths.

### Suggested classifier JSON contract

```json
{
  "primary_type": "social",
  "secondary_types": ["arts"],
  "confidence": 0.72,
  "rationale": "Poker night hosted by a VC is primarily a social hangout."
}
```

Prompt must list the closed id set, prefer a single primary, allow 0–2 secondaries, and instruct “if unsure, primary_type=other with low confidence.”

### Testing

- Unit: taxonomy validation, JSON parse, confidence threshold → `fallback` + `other`.  
- Unit: classifier off/mock leaves or marks `untyped` / `rules` without throwing.  
- Unit: Other filter excludes `type_source = untyped`.  
- Integration: ingest returns quickly with `untyped`; classify job updates row; feed includes fields.  
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
- Proxy SF Luma popular list (20 events) is heavily builders-skewed with a long tail of social/sports/arts/talks — keyword rules fail on multi-intent and brand-joke titles. Descriptions were empty in that JSON-LD sample, so proxy eval is title/location/host-skewed until a prod dump exists.  
- Calendar sync implies production will look more like a **personal RSVP mix** than a curated AI-only feed.  
- Recommended approach: **async LLM classifier + closed taxonomy + human override + soft failure**; feature-flag InsForge AI until the call path is verified in-app (no current app usage of the AI client).

## Further Notes

- Before coding, label ~30 real prod titles into the taxonomy and measure mock-prompt accuracy; adjust labels (e.g. merge `talks` → `builders`) if confusion is high.  
- Default ship path if AI is not ready: persist schema + UI + `untyped`/`rules`/`human`, then turn on `model` behind the flag.  
- Suggested issue labels after human review: `needs-triage` → `ready-for-agent` once taxonomy is confirmed and a prod corpus sample is attached.
