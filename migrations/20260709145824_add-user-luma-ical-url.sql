-- Luma calendar sync: store each member's personal Luma iCal subscription URL.
-- A member pastes it once; the sync harvests their registered/hosting events
-- into the shared feed. Both columns are nullable -- unset until a member
-- connects their calendar.
--
-- luma_ical_url is a per-user secret (it grants read access to that person's
-- Luma RSVPs). It is only ever read server-side via the admin key; never add
-- it to a client-facing select projection.
--
-- luma_ical_synced_at powers the "stale -> re-sync on feed load" trigger, so we
-- can avoid depending on cron (throttled hard on the Vercel Hobby plan).

alter table public.users
  add column luma_ical_url text,
  add column luma_ical_synced_at timestamptz;
