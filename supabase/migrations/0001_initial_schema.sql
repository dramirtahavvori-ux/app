-- NephroRounds Studio Supabase schema
-- Apply in Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'presenter', 'user');
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, email, role)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)) || '-' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default '',
  email text not null default '',
  role public.app_role not null default 'user',
  discipline text not null default '',
  university text not null default '',
  location text not null default '',
  bio text not null default '',
  photo_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id boolean primary key default true check (id),
  landing jsonb not null default '{}'::jsonb,
  meeting jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, landing, meeting, appearance)
values (
  true,
  '{
    "brandName": "NephroRounds Studio",
    "brandTagline": "Editable nephrology morning report",
    "loginHeadline": "Build each round yourself.",
    "loginLead": "Edit the schedule, presenters, guests, photos, introductions, questions, and the meeting link from the admin console.",
    "heroBadge": "Nephrology case conference",
    "heroHeadline": "Schedule. Speakers. Guests. Questions. All editable.",
    "heroImage": "",
    "metrics": [
      {"value": "Edit", "label": "Calendar"},
      {"value": "Upload", "label": "Photos"},
      {"value": "Lock", "label": "Answers"}
    ],
    "cards": [
      {"title": "Admin-controlled content", "text": "Add as many presenters and guests as you want, with photos and affiliations."},
      {"title": "Flexible calendar", "text": "Each item can have its own date, time, topic, and notes."},
      {"title": "Locked responses", "text": "Users choose an answer, write a reason, and cannot edit after submitting."}
    ]
  }'::jsonb,
  '{
    "enabled": true,
    "reportHeading": "Nephrology Morning Report",
    "reportSubheading": "Schedule, speakers, video access, and locked audience responses.",
    "title": "Nephrology Morning Report",
    "time": "08:30 - 09:00",
    "url": "https://meet.google.com/",
    "notes": "Today: high-yield nephrology cases, action items for admitted patients, and teaching points for the team."
  }'::jsonb,
  '{"scheduleHeight": 165, "heroHeight": 330, "avatarSize": 74, "panelPadding": 18, "brandAlign": "left"}'::jsonb
)
on conflict (id) do nothing;

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time,
  topic text not null,
  notes text not null default '',
  recording_url text not null default '',
  recording_file_url text not null default '',
  slides_url text not null default '',
  slides_file_url text not null default '',
  slides_name text not null default '',
  slides_type text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('presenter', 'guest')),
  name text not null,
  role_title text not null default '',
  institution text not null default '',
  location text not null default '',
  introduction text not null default '',
  photo_url text not null default '',
  tone text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  options jsonb not null default '["Yes", "No"]'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  choice text not null,
  reason text not null,
  submitted_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hand_raises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.media_controls (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  mic_allowed boolean not null default true,
  camera_allowed boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  bucket text not null,
  path text not null,
  public_url text not null default '',
  file_name text not null default '',
  content_type text not null default '',
  purpose text not null default 'shared',
  created_at timestamptz not null default now()
);

drop trigger if exists create_profile_for_new_auth_user on auth.users;
create trigger create_profile_for_new_auth_user
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_schedules_date_time on public.schedules(date, start_time);
create index if not exists idx_people_type on public.people(type);
create index if not exists idx_questions_active_order on public.questions(active, sort_order);
create index if not exists idx_answers_user on public.answers(user_id);
create index if not exists idx_live_messages_created_at on public.live_messages(created_at desc);
create index if not exists idx_hand_raises_status on public.hand_raises(status);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();
drop trigger if exists set_schedules_updated_at on public.schedules;
create trigger set_schedules_updated_at before update on public.schedules for each row execute function public.set_updated_at();
drop trigger if exists set_people_updated_at on public.people;
create trigger set_people_updated_at before update on public.people for each row execute function public.set_updated_at();
drop trigger if exists set_questions_updated_at on public.questions;
create trigger set_questions_updated_at before update on public.questions for each row execute function public.set_updated_at();
drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();
drop trigger if exists set_media_controls_updated_at on public.media_controls;
create trigger set_media_controls_updated_at before update on public.media_controls for each row execute function public.set_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin'::public.app_role, false)
$$;

create or replace function public.is_presenter_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('admin'::public.app_role, 'presenter'::public.app_role), false)
$$;

create or replace function public.update_schedule_slides(
  schedule_id uuid,
  slide_url text,
  slide_file_url text,
  slide_name text,
  slide_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_presenter_or_admin() then
    raise exception 'Only presenters and admins can update slides.';
  end if;

  update public.schedules
  set
    slides_url = coalesce(slide_url, ''),
    slides_file_url = coalesce(slide_file_url, ''),
    slides_name = coalesce(slide_name, ''),
    slides_type = coalesce(slide_type, ''),
    updated_by = auth.uid()
  where id = schedule_id;
end;
$$;

grant execute on function public.update_schedule_slides(uuid, text, text, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.schedules enable row level security;
alter table public.people enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.announcements enable row level security;
alter table public.live_messages enable row level security;
alter table public.hand_raises enable row level security;
alter table public.media_controls enable row level security;
alter table public.uploads enable row level security;

drop policy if exists "profiles are readable for sign in and directory" on public.profiles;
create policy "profiles are readable for sign in and directory"
on public.profiles for select
using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "authenticated read settings" on public.app_settings;
create policy "authenticated read settings" on public.app_settings for select to authenticated using (true);
drop policy if exists "admins manage settings" on public.app_settings;
create policy "admins manage settings" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read schedules" on public.schedules;
create policy "authenticated read schedules" on public.schedules for select to authenticated using (true);
drop policy if exists "admins manage schedules" on public.schedules;
create policy "admins manage schedules" on public.schedules for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "presenters update slides" on public.schedules;

drop policy if exists "authenticated read people" on public.people;
create policy "authenticated read people" on public.people for select to authenticated using (true);
drop policy if exists "admins manage people" on public.people;
create policy "admins manage people" on public.people for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read questions" on public.questions;
create policy "authenticated read questions" on public.questions for select to authenticated using (active or public.is_admin());
drop policy if exists "admins manage questions" on public.questions;
create policy "admins manage questions" on public.questions for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own answers admins read all" on public.answers;
create policy "users read own answers admins read all" on public.answers for select
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users submit own answers once" on public.answers;
create policy "users submit own answers once" on public.answers for insert
with check (user_id = auth.uid());
drop policy if exists "admins delete answers" on public.answers;
create policy "admins delete answers" on public.answers for delete using (public.is_admin());

drop policy if exists "authenticated read announcements" on public.announcements;
create policy "authenticated read announcements" on public.announcements for select to authenticated using (active or public.is_admin());
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "authenticated read live messages" on public.live_messages;
create policy "authenticated read live messages" on public.live_messages for select to authenticated using (true);
drop policy if exists "authenticated create live messages" on public.live_messages;
create policy "authenticated create live messages" on public.live_messages for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admins delete live messages" on public.live_messages;
create policy "admins delete live messages" on public.live_messages for delete using (public.is_admin());

drop policy if exists "authenticated read hand raises" on public.hand_raises;
create policy "authenticated read hand raises" on public.hand_raises for select to authenticated using (true);
drop policy if exists "users create own hand raise" on public.hand_raises;
create policy "users create own hand raise" on public.hand_raises for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "admins update hand raises" on public.hand_raises;
create policy "admins update hand raises" on public.hand_raises for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete hand raises" on public.hand_raises;
create policy "admins delete hand raises" on public.hand_raises for delete using (public.is_admin());

drop policy if exists "authenticated read media controls" on public.media_controls;
create policy "authenticated read media controls" on public.media_controls for select to authenticated using (true);
drop policy if exists "admins manage media controls" on public.media_controls;
create policy "admins manage media controls" on public.media_controls for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users read own uploads admins read all" on public.uploads;
create policy "users read own uploads admins read all" on public.uploads for select
using (owner_id = auth.uid() or public.is_admin() or public.is_presenter_or_admin());
drop policy if exists "authenticated insert uploads" on public.uploads;
create policy "authenticated insert uploads" on public.uploads for insert to authenticated with check (owner_id = auth.uid() or public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('public-images', 'public-images', true),
  ('presenter-slides', 'presenter-slides', true),
  ('recordings', 'recordings', true)
on conflict (id) do nothing;

drop policy if exists "authenticated upload public images" on storage.objects;
create policy "authenticated upload public images"
on storage.objects for insert to authenticated
with check (bucket_id in ('public-images', 'presenter-slides', 'recordings'));

drop policy if exists "public read shared storage" on storage.objects;
create policy "public read shared storage"
on storage.objects for select
using (bucket_id in ('public-images', 'presenter-slides', 'recordings'));

drop policy if exists "owners and admins update storage objects" on storage.objects;
create policy "owners and admins update storage objects"
on storage.objects for update to authenticated
using (owner = auth.uid() or public.is_admin())
with check (owner = auth.uid() or public.is_admin());

drop policy if exists "owners and admins delete storage objects" on storage.objects;
create policy "owners and admins delete storage objects"
on storage.objects for delete to authenticated
using (owner = auth.uid() or public.is_admin());
