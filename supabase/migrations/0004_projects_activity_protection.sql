-- Ongoing projects, owner-only activity log, auto-approval by email domain.
-- Run after 0003. Safe to run more than once.

-- ---------------------------------------------------------------
-- 1. Owner: one person who alone can see the activity log
-- ---------------------------------------------------------------
alter table public.profiles add column if not exists is_owner boolean not null default false;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_owner and status = 'approved')
$$;

grant execute on function public.is_owner() to authenticated;

-- Only the owner (or the SQL editor) can give or remove owner rights.
create or replace function public.protect_owner_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_owner is distinct from old.is_owner and auth.uid() is not null and not public.is_owner() then
    raise exception 'Only the owner can change owner rights.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_owner_flag on public.profiles;
create trigger protect_owner_flag before update on public.profiles
for each row execute function public.protect_owner_flag();

-- ---------------------------------------------------------------
-- 2. Activity log (insert: everyone for themselves; read: owner only)
-- ---------------------------------------------------------------
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (char_length(kind) <= 40),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_created on public.activity_log(created_at desc);
create index if not exists idx_activity_user on public.activity_log(user_id, created_at desc);
create index if not exists idx_activity_kind on public.activity_log(kind, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "users log own activity" on public.activity_log;
create policy "users log own activity" on public.activity_log for insert to authenticated
with check (user_id = auth.uid() and public.is_approved());

drop policy if exists "owner reads activity" on public.activity_log;
create policy "owner reads activity" on public.activity_log for select to authenticated
using (public.is_owner());

drop policy if exists "owner deletes activity" on public.activity_log;
create policy "owner deletes activity" on public.activity_log for delete to authenticated
using (public.is_owner());

-- ---------------------------------------------------------------
-- 3. Ongoing projects
-- ---------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  status text not null default 'active'
    check (status in ('planning', 'active', 'analysis', 'writing', 'submitted', 'published', 'paused')),
  progress integer not null default 0 check (progress between 0 and 100),
  lead_name text not null default '',
  team text not null default '',
  tags text not null default '',
  link_url text not null default '',
  needs_help boolean not null default false,
  help_text text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_interest (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_interest enable row level security;

drop policy if exists "approved read projects" on public.projects;
create policy "approved read projects" on public.projects for select to authenticated
using ((active and public.is_approved()) or public.is_admin());
drop policy if exists "admins manage projects" on public.projects;
create policy "admins manage projects" on public.projects for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "read own interest admins read all" on public.project_interest;
create policy "read own interest admins read all" on public.project_interest for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users add own interest" on public.project_interest;
create policy "users add own interest" on public.project_interest for insert to authenticated
with check (user_id = auth.uid() and public.is_approved());
drop policy if exists "users remove own interest" on public.project_interest;
create policy "users remove own interest" on public.project_interest for delete to authenticated
using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------
-- 4. Access settings: auto-approve trusted email domains, protection
-- ---------------------------------------------------------------
alter table public.app_settings add column if not exists access jsonb not null default '{}'::jsonb;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_username text := lower(nullif(trim(new.raw_user_meta_data->>'username'), ''));
  final_username text;
  email_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
  trusted boolean := false;
begin
  final_username := coalesce(wanted_username, lower(split_part(new.email, '@', 1)));
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := final_username || '-' || substr(new.id::text, 1, 6);
  end if;

  select exists (
    select 1
    from public.app_settings s,
         jsonb_array_elements_text(coalesce(s.access->'autoApproveDomains', '[]'::jsonb)) as d(domain)
    where s.id = true
      and email_domain <> ''
      and (email_domain = lower(trim(d.domain)) or email_domain like '%.' || lower(trim(d.domain)))
  ) into trusted;

  insert into public.profiles (id, username, full_name, email, role, status, discipline, university)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    'user',
    case when trusted then 'approved' else 'pending' end,
    coalesce(new.raw_user_meta_data->>'discipline', ''),
    coalesce(new.raw_user_meta_data->>'university', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 5. Live updates
-- ---------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['projects', 'activity_log'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
