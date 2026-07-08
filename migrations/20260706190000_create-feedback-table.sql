-- User feedback submissions from the in-app form.

create table public.feedback (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on public.feedback (user_id);
create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

create policy "users insert own feedback"
  on public.feedback
  for insert
  to authenticated
  with check (
    user_id = (
      select u.id
      from public.users u
      where u.clerk_id = public.requesting_user_id()
    )
  );

grant insert on public.feedback to authenticated;
