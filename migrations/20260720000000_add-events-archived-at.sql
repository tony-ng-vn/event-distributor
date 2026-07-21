-- Luma-style finished-event lifecycle: archived_at stamps when the daily
-- housekeeping job retires an ended event. Nullable so live/upcoming rows stay
-- unarchived; the shared feed hides any row that is archived or already ended.
-- Archiving (vs hard delete) preserves leaderboard event-count history and is
-- reversible.

alter table public.events add column archived_at timestamptz;

create index if not exists events_archived_at_idx on public.events (archived_at);
