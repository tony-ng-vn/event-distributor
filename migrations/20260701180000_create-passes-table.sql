-- Per-user pass/reject records — synced across devices for signed-in users.

create table public.passes (
  id text primary key,
  event_id text not null references public.events (id) on delete cascade,
  user_id text not null references public.users (id) on delete cascade,
  passed_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index passes_user_id_idx on public.passes (user_id);

alter table public.passes enable row level security;

create policy "users pass for themselves"
  on public.passes
  for insert
  to authenticated
  with check (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

grant insert on public.passes to authenticated;
