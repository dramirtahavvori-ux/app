-- Self sign-up with admin approval + public landing page content.
-- Safe to run more than once in the Supabase SQL editor.

-- 1. Approval status on every profile
-- Everyone who already had an account keeps access (only on first run).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'status'
  ) then
    alter table public.profiles
      add column status text not null default 'approved'
      check (status in ('pending', 'approved', 'rejected'));
    alter table public.profiles alter column status set default 'pending';
  end if;
end $$;

create index if not exists idx_profiles_status on public.profiles(status);

-- 2. New sign-ups: take name / username / details from sign-up form, start as pending user
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_username text := lower(nullif(trim(new.raw_user_meta_data->>'username'), ''));
  final_username text;
begin
  final_username := coalesce(wanted_username, lower(split_part(new.email, '@', 1)));
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := final_username || '-' || substr(new.id::text, 1, 6);
  end if;

  insert into public.profiles (id, username, full_name, email, role, status, discipline, university)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    'user',
    'pending',
    coalesce(new.raw_user_meta_data->>'discipline', ''),
    coalesce(new.raw_user_meta_data->>'university', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Users can edit their own profile but never their own role or approval status
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and status = (select p.status from public.profiles p where p.id = auth.uid())
);

-- 4. Pending or rejected accounts get no admin / presenter powers
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and status = 'approved'
$$;

-- 5. Landing page text/image readable before sign-in (meeting link stays private)
create or replace function public.public_landing()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select landing from public.app_settings where id = true
$$;

grant execute on function public.public_landing() to anon, authenticated;

-- 6. Stop exposing the whole user list to visitors who are not signed in.
--    Sign-in by username uses this narrow lookup instead.
create or replace function public.email_for_username(lookup text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(trim(lookup)) limit 1
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

drop policy if exists "profiles are readable for sign in and directory" on public.profiles;
create policy "profiles are readable for sign in and directory"
on public.profiles for select to authenticated
using (true);
