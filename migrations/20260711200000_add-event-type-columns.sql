-- Event type classification: closed taxonomy for feed filters.
-- primary_type is always non-null (default other). type_source distinguishes
-- "not classified yet" (untyped) from "classified as other" (model/rules/fallback/human).
-- Other feed filter MUST exclude type_source = untyped (see PRD #46).

alter table public.events
  add column primary_type text not null default 'other',
  add column secondary_types text[] not null default '{}',
  add column type_confidence real,
  add column type_source text not null default 'untyped',
  add column type_rationale text,
  add column typed_at timestamptz;

alter table public.events
  add constraint events_primary_type_check
    check (primary_type in ('social', 'builders', 'talks', 'sports', 'arts', 'other'));

alter table public.events
  add constraint events_type_source_check
    check (type_source in ('untyped', 'model', 'rules', 'fallback', 'human'));

create index events_primary_type_idx on public.events (primary_type);
create index events_type_source_untyped_idx
  on public.events (type_source)
  where type_source = 'untyped';
