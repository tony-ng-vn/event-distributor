-- Waitlist access gate: new sign-ups are pending (approved = false) until an
-- admin lets them in. Grandfather everyone already in the app at migration
-- time -- they are the current friend circle, not the strangers we want to gate.

alter table public.users
  add column approved boolean not null default false;

update public.users
set approved = true;

-- Waitlist reads only ever ask for the pending rows, so index just those.
create index users_pending_approval_idx
  on public.users (created_at)
  where approved = false;
