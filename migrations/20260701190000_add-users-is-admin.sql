-- Admin flag for platform moderators (can delete any event).

alter table public.users
  add column is_admin boolean not null default false;

update public.users
set is_admin = true
where lower(email) = lower('tonythiennguyen17@gmail.com');
