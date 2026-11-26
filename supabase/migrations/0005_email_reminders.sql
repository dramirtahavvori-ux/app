-- 0005: Email reminders before each session
-- Sends a reminder email the day before and one hour before every session on the
-- schedule, to every approved member who has email reminders turned on.
-- Emails go out through the Brevo API. The API key lives in Supabase Vault under
-- the name 'brevo_api_key' (Dashboard → Integrations → Vault → Add new secret).
-- Safe to run more than once.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1. Each member can turn email reminders on or off for themselves
alter table public.profiles add column if not exists email_reminders boolean not null default true;

-- 2. Record of every reminder sent (prevents duplicates)
create table if not exists public.reminder_sends (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  offset_minutes integer not null,
  email text not null default '',
  request_id bigint,
  sent_at timestamptz not null default now(),
  primary key (schedule_id, user_id, offset_minutes)
);
alter table public.reminder_sends enable row level security;
drop policy if exists "admins read reminder sends" on public.reminder_sends;
create policy "admins read reminder sends" on public.reminder_sends
  for select to authenticated using (public.is_admin());
grant select on public.reminder_sends to authenticated;

-- 3. Settings live in app_settings.access -> 'reminders'
--    { "enabled": true, "timezone": "America/Los_Angeles",
--      "offsets": [1440, 60], "senderEmail": "...", "appUrl": "..." }
create or replace function public.reminder_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', coalesce((s.access->'reminders'->>'enabled')::boolean, true),
    'timezone', coalesce(nullif(s.access->'reminders'->>'timezone', ''), 'America/Los_Angeles'),
    'offsets', coalesce(s.access->'reminders'->'offsets', '[1440, 60]'::jsonb),
    'senderEmail', coalesce(nullif(s.access->'reminders'->>'senderEmail', ''), 'dr.amir.tahavvori@gmail.com'),
    'senderName', coalesce(nullif(s.landing->>'brandName', ''), 'NephroRounds Studio'),
    'appUrl', coalesce(nullif(s.access->'reminders'->>'appUrl', ''), 'https://app-pink-seven-62.vercel.app'),
    'meetingUrl', coalesce(s.meeting->>'url', ''),
    'copyright', coalesce(nullif(s.landing->>'copyright', ''), '')
  )
  from public.app_settings s
  where s.id = true
$$;
revoke all on function public.reminder_settings() from public, anon, authenticated;

create or replace function public.html_escape(value text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(coalesce(value, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

-- 4. Build and send one reminder email through Brevo. Returns the pg_net request id.
create or replace function public.send_reminder_email(
  to_email text,
  to_name text,
  session_topic text,
  session_start timestamptz,
  lead_label text,
  is_test boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg jsonb := public.reminder_settings();
  api_key text;
  tz text := cfg->>'timezone';
  local_start timestamp := session_start at time zone tz;
  when_text text := to_char(local_start, 'FMDay, FMMonth FMDD, YYYY') || ' at ' || to_char(local_start, 'FMHH12:MI AM') || ' (' || replace(split_part(tz, '/', 2), '_', ' ') || ' time)';
  brand text := cfg->>'senderName';
  join_block text := '';
  subject text;
  html text;
  request_id bigint;
begin
  select decrypted_secret into api_key from vault.decrypted_secrets where name = 'brevo_api_key' limit 1;
  if api_key is null or api_key = '' then
    raise exception 'Email reminders are not connected yet: add the Brevo API key to Vault as brevo_api_key';
  end if;

  if coalesce(cfg->>'meetingUrl', '') <> '' then
    join_block := format(
      '<p style="margin:22px 0 0"><a href="%s" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">Join the session</a></p>',
      public.html_escape(cfg->>'meetingUrl'));
  end if;

  subject := case when is_test then '[Test] ' else '' end || 'Reminder: ' || session_topic || ' — ' || lead_label;
  html := format($html$
<div style="font-family:Arial,Helvetica,sans-serif;background:#f3f6f6;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dfe7e6">
    <div style="background:#0d3b3a;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:700">%s</div>
    <div style="padding:24px;color:#1d2b2a;font-size:15px;line-height:1.55">
      %s
      <p style="margin:0 0 6px">Hello %s,</p>
      <p style="margin:0 0 16px">This is a reminder that the next session starts <strong>%s</strong>.</p>
      <div style="border-left:4px solid #0f766e;background:#f0f7f6;padding:12px 16px;border-radius:6px">
        <div style="font-size:17px;font-weight:700">%s</div>
        <div style="color:#4d5f5d;margin-top:4px">%s</div>
      </div>
      %s
      <p style="margin:18px 0 0">Open the app to see the schedule, slides, and questions: <a href="%s" style="color:#0f766e">%s</a></p>
    </div>
    <div style="padding:14px 24px;background:#f7f9f9;color:#6b7b79;font-size:12px;line-height:1.5">
      You receive this because email reminders are on in your %s account. To stop them, open the app and turn off <em>Email reminders</em> on the Morning report page.<br>%s
    </div>
  </div>
</div>$html$,
    public.html_escape(brand),
    case when is_test then '<p style="margin:0 0 14px;color:#8a5a10;background:#fdf3e1;padding:8px 12px;border-radius:6px">This is a test reminder sent from the admin console.</p>' else '' end,
    public.html_escape(coalesce(nullif(to_name, ''), 'there')),
    public.html_escape(lead_label),
    public.html_escape(session_topic),
    public.html_escape(when_text),
    join_block,
    public.html_escape(cfg->>'appUrl'), public.html_escape(cfg->>'appUrl'),
    public.html_escape(brand),
    public.html_escape(cfg->>'copyright'));

  select net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', brand, 'email', cfg->>'senderEmail'),
      'to', jsonb_build_array(jsonb_build_object('email', to_email, 'name', coalesce(nullif(to_name, ''), to_email))),
      'subject', subject,
      'htmlContent', html,
      'tags', jsonb_build_array('session-reminder')
    ),
    headers := jsonb_build_object('api-key', api_key, 'content-type', 'application/json', 'accept', 'application/json'),
    timeout_milliseconds := 10000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function public.send_reminder_email(text, text, text, timestamptz, text, boolean) from public, anon, authenticated;

drop function if exists public.lead_label(integer);
create or replace function public.lead_label(starts_at timestamptz, tz text)
returns text
language plpgsql
stable
as $$
declare
  mins integer := greatest(0, round(extract(epoch from (starts_at - now())) / 60)::integer);
  start_day date := (starts_at at time zone tz)::date;
  today date := (now() at time zone tz)::date;
begin
  if mins <= 45 then return 'in ' || greatest(5, (round(mins / 5.0) * 5)::integer) || ' minutes'; end if;
  if mins <= 80 then return 'in about 1 hour'; end if;
  if start_day = today then return 'today'; end if;
  if start_day = today + 1 then return 'tomorrow'; end if;
  return 'on ' || to_char(starts_at at time zone tz, 'FMDay');
end;
$$;

-- 5. Called every 5 minutes by pg_cron. Each reminder is sent once, inside its window:
--    the window for an offset runs from (start - offset) until (start - next smaller offset).
create or replace function public.send_due_reminders()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg jsonb := public.reminder_settings();
  tz text := cfg->>'timezone';
  offsets integer[];
  sent integer := 0;
  rec record;
  rid bigint;
begin
  if not coalesce((cfg->>'enabled')::boolean, true) then return 0; end if;
  if not exists (select 1 from vault.decrypted_secrets where name = 'brevo_api_key') then return 0; end if;

  select array_agg(v::integer order by v::integer desc) into offsets
  from jsonb_array_elements_text(cfg->'offsets') v
  where v ~ '^\d+$' and v::integer between 5 and 10080;
  if offsets is null then return 0; end if;

  for rec in
    with sessions as (
      select s.id, s.topic, ((s.date + s.start_time) at time zone tz) as starts_at
      from public.schedules s
      where s.date between (now() at time zone tz)::date - 1 and (now() at time zone tz)::date + 8
    ),
    windows as (
      select o.off, coalesce(lead(o.off) over (order by o.off desc), 0) as next_off
      from unnest(offsets) as o(off)
    )
    select se.id as schedule_id, se.topic, se.starts_at, w.off, p.id as user_id,
           coalesce(nullif(u.email, ''), p.email) as email, p.full_name
    from sessions se
    cross join windows w
    join public.profiles p on p.status = 'approved' and p.email_reminders
    join auth.users u on u.id = p.id
    where now() >= se.starts_at - make_interval(mins => w.off)
      and now() <  se.starts_at - make_interval(mins => w.next_off)
      and se.starts_at > now()
      and coalesce(nullif(u.email, ''), p.email) like '%@%'
      and not exists (
        select 1 from public.reminder_sends r
        where r.schedule_id = se.id and r.user_id = p.id and r.offset_minutes = w.off
      )
    limit 200
  loop
    -- reserve first so a failure never causes a duplicate email
    insert into public.reminder_sends (schedule_id, user_id, offset_minutes, email)
    values (rec.schedule_id, rec.user_id, rec.off, rec.email)
    on conflict do nothing;
    if found then
      rid := public.send_reminder_email(rec.email, rec.full_name, rec.topic, rec.starts_at, public.lead_label(rec.starts_at, tz));
      update public.reminder_sends set request_id = rid
      where schedule_id = rec.schedule_id and user_id = rec.user_id and offset_minutes = rec.off;
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;
revoke all on function public.send_due_reminders() from public, anon, authenticated;

-- 6. Admin: send a test reminder to yourself about the next session
create or replace function public.send_test_reminder()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg jsonb := public.reminder_settings();
  tz text := cfg->>'timezone';
  me record;
  next_topic text;
  next_start timestamptz;
  rid bigint;
begin
  if not public.is_admin() then raise exception 'Only admins can send a test reminder'; end if;
  select p.full_name, coalesce(nullif(u.email, ''), p.email) as email into me
  from public.profiles p join auth.users u on u.id = p.id where p.id = auth.uid();
  select s.topic, ((s.date + s.start_time) at time zone tz) into next_topic, next_start
  from public.schedules s
  where ((s.date + s.start_time) at time zone tz) > now()
  order by s.date, s.start_time limit 1;
  if next_topic is null then
    next_topic := 'Sample session';
    next_start := now() + interval '1 day';
  end if;
  rid := public.send_reminder_email(me.email, me.full_name, next_topic, next_start, public.lead_label(next_start, tz), true);
  return jsonb_build_object('request_id', rid, 'email', me.email);
end;
$$;
revoke all on function public.send_test_reminder() from public, anon;
grant execute on function public.send_test_reminder() to authenticated;

-- 7. Admin: delivery status (Brevo answer for each recent email)
create or replace function public.reminder_status()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Only admins can see reminder status'; end if;
  select jsonb_build_object(
    'connected', exists (select 1 from vault.decrypted_secrets where name = 'brevo_api_key'),
    'scheduled', exists (select 1 from cron.job where jobname = 'nephro-session-reminders' and active),
    'recent', coalesce((
      select jsonb_agg(x order by x->>'sent_at' desc)
      from (
        select jsonb_build_object(
          'sent_at', r.sent_at,
          'email', r.email,
          'topic', s.topic,
          'offset', r.offset_minutes,
          'status', resp.status_code,
          'error', coalesce(resp.error_msg, case when resp.status_code >= 300 then left(resp.content, 200) end)
        ) as x
        from public.reminder_sends r
        join public.schedules s on s.id = r.schedule_id
        left join net._http_response resp on resp.id = r.request_id
        order by r.sent_at desc
        limit 20
      ) q
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.reminder_status() from public, anon;
grant execute on function public.reminder_status() to authenticated;

create or replace function public.test_reminder_result(request bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'Only admins can see reminder status'; end if;
  select jsonb_build_object('status', status_code, 'error', coalesce(error_msg, case when status_code >= 300 then left(content, 300) end))
  into result from net._http_response where id = request;
  return coalesce(result, '{"status": null}'::jsonb);
end;
$$;
revoke all on function public.test_reminder_result(bigint) from public, anon;
grant execute on function public.test_reminder_result(bigint) to authenticated;

-- 8. Run every 5 minutes
do $$
begin
  if exists (select 1 from cron.job where jobname = 'nephro-session-reminders') then
    perform cron.unschedule('nephro-session-reminders');
  end if;
  perform cron.schedule('nephro-session-reminders', '*/5 * * * *', 'select public.send_due_reminders()');
end $$;
