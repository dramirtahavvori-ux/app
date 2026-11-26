-- Updates feed, training programs, approval-gated reads and realtime.
-- Run after 0002_signup_approval.sql. Safe to run more than once.

-- ---------------------------------------------------------------
-- 1. Only approved accounts can see or post content
-- ---------------------------------------------------------------
create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
$$;

grant execute on function public.is_approved() to authenticated;

drop policy if exists "authenticated read settings" on public.app_settings;
create policy "authenticated read settings" on public.app_settings for select to authenticated using (public.is_approved());

drop policy if exists "authenticated read schedules" on public.schedules;
create policy "authenticated read schedules" on public.schedules for select to authenticated using (public.is_approved());

drop policy if exists "authenticated read people" on public.people;
create policy "authenticated read people" on public.people for select to authenticated using (public.is_approved());

drop policy if exists "authenticated read questions" on public.questions;
create policy "authenticated read questions" on public.questions for select to authenticated
using ((active and public.is_approved()) or public.is_admin());

drop policy if exists "users submit own answers once" on public.answers;
create policy "users submit own answers once" on public.answers for insert
with check (user_id = auth.uid() and public.is_approved());

drop policy if exists "authenticated read live messages" on public.live_messages;
create policy "authenticated read live messages" on public.live_messages for select to authenticated using (public.is_approved());
drop policy if exists "authenticated create live messages" on public.live_messages;
create policy "authenticated create live messages" on public.live_messages for insert to authenticated
with check (user_id = auth.uid() and public.is_approved());

drop policy if exists "authenticated read hand raises" on public.hand_raises;
create policy "authenticated read hand raises" on public.hand_raises for select to authenticated using (public.is_approved());
drop policy if exists "users create own hand raise" on public.hand_raises;
create policy "users create own hand raise" on public.hand_raises for insert to authenticated
with check (user_id = auth.uid() and public.is_approved());

drop policy if exists "authenticated read media controls" on public.media_controls;
create policy "authenticated read media controls" on public.media_controls for select to authenticated using (public.is_approved());

drop policy if exists "authenticated upload public images" on storage.objects;
create policy "authenticated upload public images"
on storage.objects for insert to authenticated
with check (bucket_id in ('public-images', 'presenter-slides', 'recordings') and public.is_approved());

-- ---------------------------------------------------------------
-- 2. Updates / announcements
-- ---------------------------------------------------------------
alter table public.announcements add column if not exists category text not null default 'update';
alter table public.announcements add column if not exists pinned boolean not null default false;
alter table public.announcements add column if not exists link_url text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'announcements_category_check') then
    alter table public.announcements
      add constraint announcements_category_check check (category in ('update', 'reminder', 'event', 'training'));
  end if;
end $$;

drop policy if exists "authenticated read announcements" on public.announcements;
create policy "authenticated read announcements" on public.announcements for select to authenticated
using ((active and public.is_approved()) or public.is_admin());

-- When each user last opened the Updates page (for the unread badge)
alter table public.profiles add column if not exists updates_seen_at timestamptz;

-- ---------------------------------------------------------------
-- 3. Training programs
-- ---------------------------------------------------------------
create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  cover_url text not null default '',
  level text not null default '',
  audience text not null default 'all' check (audience in ('all', 'user', 'presenter', 'admin')),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_lessons (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  title text not null,
  body text not null default '',
  video_url text not null default '',
  resource_url text not null default '',
  resource_name text not null default '',
  duration_minutes integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.training_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists idx_training_lessons_program on public.training_lessons(program_id, sort_order);
create index if not exists idx_training_progress_user on public.training_progress(user_id);

drop trigger if exists set_training_programs_updated_at on public.training_programs;
create trigger set_training_programs_updated_at before update on public.training_programs for each row execute function public.set_updated_at();
drop trigger if exists set_training_lessons_updated_at on public.training_lessons;
create trigger set_training_lessons_updated_at before update on public.training_lessons for each row execute function public.set_updated_at();

alter table public.training_programs enable row level security;
alter table public.training_lessons enable row level security;
alter table public.training_progress enable row level security;

drop policy if exists "approved read training programs" on public.training_programs;
create policy "approved read training programs" on public.training_programs for select to authenticated
using (
  public.is_admin()
  or (active and public.is_approved() and (audience = 'all' or audience = public.current_app_role()::text))
);
drop policy if exists "admins manage training programs" on public.training_programs;
create policy "admins manage training programs" on public.training_programs for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "approved read training lessons" on public.training_lessons;
create policy "approved read training lessons" on public.training_lessons for select to authenticated
using (exists (select 1 from public.training_programs p where p.id = program_id));
drop policy if exists "admins manage training lessons" on public.training_lessons;
create policy "admins manage training lessons" on public.training_lessons for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own progress admins read all" on public.training_progress;
create policy "users read own progress admins read all" on public.training_progress for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users record own progress" on public.training_progress;
create policy "users record own progress" on public.training_progress for insert to authenticated
with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "users undo own progress" on public.training_progress;
create policy "users undo own progress" on public.training_progress for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------
-- 4. Live updates for every shared table
-- ---------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'app_settings', 'schedules', 'people', 'questions', 'answers', 'announcements',
      'live_messages', 'hand_raises', 'media_controls',
      'training_programs', 'training_lessons'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
