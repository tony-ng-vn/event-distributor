-- Event Radar schema: users (Clerk sync), events (Luma feed), accepts (guest list).

create or replace function public.requesting_user_id()
returns text
language sql
stable
set search_path = pg_catalog, public, pg_temp
as $$
  select nullif(auth.jwt() ->> 'sub', '')::text
$$;

create table public.users (
  id text primary key,
  clerk_id text unique,
  email text not null unique,
  name text,
  image text,
  created_at timestamptz not null default now()
);

create table public.events (
  id text primary key,
  luma_url text not null unique,
  title text not null,
  description text not null default '',
  cover_image_url text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  location text not null default '',
  is_online boolean not null default false,
  meeting_url text,
  host_name text,
  host_avatar_url text,
  added_by_user_id text references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index events_start_at_idx on public.events (start_at);

create table public.accepts (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  accepted_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index accepts_event_id_idx on public.accepts (event_id);

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.accepts enable row level security;

create policy "public read users"
  on public.users
  for select
  to anon, authenticated
  using (true);

create policy "public read events"
  on public.events
  for select
  to anon, authenticated
  using (true);

create policy "public read accepts"
  on public.accepts
  for select
  to anon, authenticated
  using (true);

create policy "anyone can add events"
  on public.events
  for insert
  to anon, authenticated
  with check (true);

create policy "users accept for themselves"
  on public.accepts
  for insert
  to authenticated
  with check (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

grant usage on schema public to anon, authenticated;
grant select on public.users, public.events, public.accepts to anon, authenticated;
grant insert on public.events to anon, authenticated;
grant insert on public.accepts to authenticated;
