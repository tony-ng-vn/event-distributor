-- Per-user star/favorite records -- personal pin, synced across devices.
-- Mirrors passes: private to each user, one row per (event, user).

create table public.stars (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  starred_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index stars_user_id_idx on public.stars (user_id);

alter table public.stars enable row level security;

create policy "users star for themselves"
  on public.stars
  for insert
  to authenticated
  with check (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

grant insert on public.stars to authenticated;
