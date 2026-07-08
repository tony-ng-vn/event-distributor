-- Opt-in email notification preferences: one row per user.
-- Additive only. Follows the feedback-table RLS pattern (requesting_user_id()
-- matched against public.users.clerk_id), not the generic auth.uid() text, because
-- this project keys everything off public.users(id) and reads email from that row.

create table public.notification_preferences (
  user_id text primary key references public.users (id) on delete cascade,
  email_enabled boolean not null default false,
  has_responded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- email dispatch scans for enabled recipients on every new event.
create index notification_preferences_email_enabled_idx
  on public.notification_preferences (email_enabled)
  where email_enabled = true;

alter table public.notification_preferences enable row level security;

create policy "users read own notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

create policy "users insert own notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

create policy "users update own notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  )
  with check (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

grant select, insert, update on public.notification_preferences to authenticated;
