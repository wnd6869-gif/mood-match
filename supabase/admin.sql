-- Run this file manually in the Supabase SQL Editor after
-- safety-moderation.sql. No service-role key is required by the app.
--
-- Register the first administrator manually after replacing the UUID:
-- insert into public.admin_users (user_id, role)
-- values ('관리자-사용자-UUID', 'super_admin');

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'moderator',
  created_at timestamptz not null default now(),
  constraint admin_users_role_valid
    check (role in ('moderator', 'admin', 'super_admin'))
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users (id),
  action text not null,
  target_user_id uuid null references auth.users (id),
  target_report_id uuid null references public.user_reports (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_action_valid
    check (
      action in (
        'user_status_changed',
        'report_status_changed',
        'public_profile_disabled',
        'admin_note_changed',
        'persona_identity_cleared',
        'persona_reanalysis_granted'
      )
    ),
  constraint admin_audit_metadata_object
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists admin_audit_logs_created_idx
on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_target_user_idx
on public.admin_audit_logs (target_user_id, created_at desc)
where target_user_id is not null;

create index if not exists admin_audit_logs_target_report_idx
on public.admin_audit_logs (target_report_id, created_at desc)
where target_report_id is not null;

alter table public.admin_users enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on table public.admin_users from anon, authenticated;
revoke all on table public.admin_audit_logs from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as administrator
    where administrator.user_id = (select auth.uid())
  );
$$;

create or replace function public.get_admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select administrator.role
  from public.admin_users as administrator
  where administrator.user_id = (select auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.get_admin_role() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_admin_role() to authenticated;

drop policy if exists "Senior admins can view audit logs"
on public.admin_audit_logs;
create policy "Senior admins can view audit logs"
on public.admin_audit_logs
for select
to authenticated
using (
  public.get_admin_role() in ('admin', 'super_admin')
);

grant select on table public.admin_audit_logs to authenticated;

create or replace function public.get_my_moderation_status()
returns table (
  status text,
  reason text,
  suspended_until timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when moderation.status = 'suspended'
        and moderation.suspended_until <= now() then 'active'
      else coalesce(moderation.status, 'active')
    end,
    case
      when moderation.status = 'suspended'
        and moderation.suspended_until <= now() then null
      else moderation.reason
    end,
    case
      when moderation.status = 'suspended'
        and moderation.suspended_until <= now() then null
      else moderation.suspended_until
    end
  from (select 1) as seed
  left join public.user_moderation_status as moderation
    on moderation.user_id = (select auth.uid())
  where (select auth.uid()) is not null;
$$;

revoke all on function public.get_my_moderation_status()
from public, anon;
grant execute on function public.get_my_moderation_status()
to authenticated;

create or replace function public.admin_role_rank(role_name text)
returns integer
language sql
immutable
security definer
set search_path = ''
as $$
  select case role_name
    when 'moderator' then 1
    when 'admin' then 2
    when 'super_admin' then 3
    else 0
  end;
$$;

create or replace function public.mask_admin_email(email_address text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when email_address is null or position('@' in email_address) = 0
      then '이메일 없음'
    else
      left(split_part(email_address, '@', 1), 2)
      || '***@'
      || split_part(email_address, '@', 2)
  end;
$$;

revoke all on function public.admin_role_rank(text)
from public, anon, authenticated;
revoke all on function public.mask_admin_email(text)
from public, anon, authenticated;

create or replace function public.admin_assert_access()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select administrator.role
  into v_role
  from public.admin_users as administrator
  where administrator.user_id = (select auth.uid());

  if v_role is null then
    raise exception using
      errcode = 'P0001',
      message = 'admin_required';
  end if;

  return v_role;
end;
$$;

revoke all on function public.admin_assert_access()
from public, anon, authenticated;

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_result jsonb;
begin
  v_role := public.admin_assert_access();

  select pg_catalog.jsonb_build_object(
    'role', v_role,
    'metrics', pg_catalog.jsonb_build_object(
      'totalUsers', (select count(*) from auth.users),
      'publicProfiles', (
        select count(*) from public.profiles where is_public = true
      ),
      'todayUsers', (
        select count(*)
        from auth.users
        where created_at >= date_trunc(
          'day',
          now() at time zone 'Asia/Seoul'
        ) at time zone 'Asia/Seoul'
      ),
      'pendingReports', (
        select count(*) from public.user_reports where status = 'pending'
      ),
      'reviewingReports', (
        select count(*) from public.user_reports where status = 'reviewing'
      ),
      'moderatedUsers', (
        select count(*)
        from public.user_moderation_status
        where status in ('restricted', 'suspended', 'banned')
          and not (
            status = 'suspended'
            and suspended_until <= now()
          )
      ),
      'directConversations', (
        select count(*) from public.conversations where type = 'direct'
      ),
      'messages24h', (
        select count(*)
        from public.messages
        where created_at >= now() - interval '24 hours'
      )
    ),
    'recentReports', coalesce((
      select jsonb_agg(to_jsonb(recent_report))
      from (
        select
          report.id,
          report.reason,
          report.status,
          report.created_at,
          coalesce(reporter.public_nickname, '비공개 사용자')
            as reporter_nickname,
          coalesce(reported.public_nickname, '비공개 사용자')
            as reported_nickname
        from public.user_reports as report
        left join public.profiles as reporter
          on reporter.id = report.reporter_id
        left join public.profiles as reported
          on reported.id = report.reported_user_id
        order by report.created_at desc
        limit 5
      ) as recent_report
    ), '[]'::jsonb),
    'recentUsers', coalesce((
      select jsonb_agg(to_jsonb(recent_user))
      from (
        select
          auth_user.id,
          public.mask_admin_email(auth_user.email) as email,
          coalesce(profile.public_nickname, '공개 닉네임 없음')
            as public_nickname,
          auth_user.created_at
        from auth.users as auth_user
        left join public.profiles as profile
          on profile.id = auth_user.id
        order by auth_user.created_at desc
        limit 5
      ) as recent_user
    ), '[]'::jsonb),
    'recentActions', coalesce((
      select jsonb_agg(to_jsonb(recent_action))
      from (
        select
          audit.action,
          audit.target_user_id,
          audit.target_report_id,
          audit.created_at
        from public.admin_audit_logs as audit
        where audit.action in (
          'user_status_changed',
          'public_profile_disabled',
          'persona_identity_cleared',
          'persona_reanalysis_granted'
        )
        order by audit.created_at desc
        limit 5
      ) as recent_action
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;

create or replace function public.admin_list_users(
  search_query text default null,
  status_filter text default null,
  public_filter boolean default null,
  min_reports integer default null
)
returns table (
  user_id uuid,
  masked_email text,
  public_nickname text,
  persona_title text,
  joined_at timestamptz,
  is_public boolean,
  moderation_status text,
  report_count bigint,
  recent_activity_at timestamptz,
  admin_role text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := nullif(btrim(search_query), '');
begin
  perform public.admin_assert_access();

  if status_filter is not null
    and status_filter not in ('active', 'restricted', 'suspended', 'banned')
  then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_status';
  end if;

  return query
  select
    auth_user.id,
    public.mask_admin_email(auth_user.email),
    coalesce(profile.public_nickname, '공개 닉네임 없음'),
    coalesce(persona.persona_title, '페르소나 없음'),
    auth_user.created_at,
    coalesce(profile.is_public, false),
    case
      when moderation.status = 'suspended'
        and moderation.suspended_until <= now() then 'active'
      else coalesce(moderation.status, 'active')
    end,
    count(distinct report.id),
    greatest(
      auth_user.last_sign_in_at,
      profile.updated_at,
      max(sent_message.created_at)
    ),
    administrator.role
  from auth.users as auth_user
  left join public.profiles as profile on profile.id = auth_user.id
  left join public.personas as persona on persona.user_id = auth_user.id
  left join public.user_moderation_status as moderation
    on moderation.user_id = auth_user.id
  left join public.user_reports as report
    on report.reported_user_id = auth_user.id
  left join public.messages as sent_message
    on sent_message.sender_id = auth_user.id
  left join public.admin_users as administrator
    on administrator.user_id = auth_user.id
  where (
      v_query is null
      or auth_user.id::text ilike '%' || v_query || '%'
      or profile.public_nickname ilike '%' || v_query || '%'
      or auth_user.email ilike '%' || v_query || '%'
    )
    and (
      status_filter is null
      or case
        when moderation.status = 'suspended'
          and moderation.suspended_until <= now() then 'active'
        else coalesce(moderation.status, 'active')
      end = status_filter
    )
    and (
      public_filter is null
      or coalesce(profile.is_public, false) = public_filter
    )
  group by
    auth_user.id,
    auth_user.email,
    auth_user.created_at,
    auth_user.last_sign_in_at,
    profile.public_nickname,
    profile.is_public,
    profile.updated_at,
    persona.persona_title,
    moderation.status,
    moderation.suspended_until,
    administrator.role
  having min_reports is null
    or count(distinct report.id) >= greatest(min_reports, 0)
  order by auth_user.created_at desc
  limit 100;
end;
$$;

revoke all on function public.admin_list_users(text, text, boolean, integer)
from public, anon;
grant execute on function public.admin_list_users(
  text, text, boolean, integer
) to authenticated;

create or replace function public.admin_get_user_detail(
  target_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.admin_assert_access();

  select pg_catalog.jsonb_build_object(
    'user', pg_catalog.jsonb_build_object(
      'id', auth_user.id,
      'email', public.mask_admin_email(auth_user.email),
      'joinedAt', auth_user.created_at,
      'lastSignInAt', auth_user.last_sign_in_at,
      'publicNickname', profile.public_nickname,
      'publicBio', profile.public_bio,
      'isPublic', coalesce(profile.is_public, false),
      'gender', profile.gender,
      'preferredGender', profile.preferred_gender,
      'personaTitle', persona.persona_title,
      'personaDescription', persona.persona_description,
      'moderationStatus', coalesce(moderation.status, 'active'),
      'moderationReason', moderation.reason,
      'suspendedUntil', moderation.suspended_until,
      'adminRole', administrator.role
    ),
    'counts', pg_catalog.jsonb_build_object(
      'reportsReceived', (
        select count(*) from public.user_reports
        where reported_user_id = auth_user.id
      ),
      'reportsSubmitted', (
        select count(*) from public.user_reports
        where reporter_id = auth_user.id
      ),
      'blockRelations', (
        select count(*) from public.user_blocks
        where blocker_id = auth_user.id or blocked_id = auth_user.id
      ),
      'conversations', (
        select count(*) from public.conversation_members
        where user_id = auth_user.id
      ),
      'messages24h', (
        select count(*) from public.messages
        where sender_id = auth_user.id
          and created_at >= now() - interval '24 hours'
      )
    ),
    'receivedReports', coalesce((
      select jsonb_agg(to_jsonb(received_report))
      from (
        select id, reason, status, created_at
        from public.user_reports
        where reported_user_id = auth_user.id
        order by created_at desc
        limit 20
      ) as received_report
    ), '[]'::jsonb),
    'submittedReports', coalesce((
      select jsonb_agg(to_jsonb(submitted_report))
      from (
        select id, reason, status, created_at
        from public.user_reports
        where reporter_id = auth_user.id
        order by created_at desc
        limit 20
      ) as submitted_report
    ), '[]'::jsonb)
  )
  into v_result
  from auth.users as auth_user
  left join public.profiles as profile on profile.id = auth_user.id
  left join public.personas as persona on persona.user_id = auth_user.id
  left join public.user_moderation_status as moderation
    on moderation.user_id = auth_user.id
  left join public.admin_users as administrator
    on administrator.user_id = auth_user.id
  where auth_user.id = target_user_id;

  return v_result;
end;
$$;

revoke all on function public.admin_get_user_detail(uuid)
from public, anon;
grant execute on function public.admin_get_user_detail(uuid)
to authenticated;

create or replace function public.admin_list_reports(
  status_filter text default null
)
returns table (
  report_id uuid,
  reason text,
  status text,
  created_at timestamptz,
  reporter_nickname text,
  reported_nickname text,
  has_conversation boolean,
  has_message boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_access();

  if status_filter is not null
    and status_filter not in ('pending', 'reviewing', 'resolved', 'dismissed')
  then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_status';
  end if;

  return query
  select
    report.id,
    report.reason,
    report.status,
    report.created_at,
    coalesce(reporter.public_nickname, '비공개 사용자'),
    coalesce(reported.public_nickname, '비공개 사용자'),
    report.conversation_id is not null,
    report.message_id is not null
  from public.user_reports as report
  left join public.profiles as reporter on reporter.id = report.reporter_id
  left join public.profiles as reported
    on reported.id = report.reported_user_id
  where status_filter is null or report.status = status_filter
  order by report.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_reports(text)
from public, anon;
grant execute on function public.admin_list_reports(text)
to authenticated;

create or replace function public.admin_get_report_detail(
  target_report_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.admin_assert_access();

  select pg_catalog.jsonb_build_object(
    'report', pg_catalog.jsonb_build_object(
      'id', report.id,
      'reason', report.reason,
      'details', report.details,
      'status', report.status,
      'createdAt', report.created_at,
      'reviewedAt', report.reviewed_at,
      'reviewedBy', report.reviewed_by,
      'adminNote', report.admin_note,
      'conversationId', report.conversation_id,
      'messageId', report.message_id
    ),
    'reporter', pg_catalog.jsonb_build_object(
      'id', report.reporter_id,
      'nickname', coalesce(reporter.public_nickname, '비공개 사용자')
    ),
    'reported', pg_catalog.jsonb_build_object(
      'id', report.reported_user_id,
      'nickname', coalesce(reported.public_nickname, '비공개 사용자'),
      'personaTitle', reported_persona.persona_title,
      'moderationStatus', coalesce(moderation.status, 'active'),
      'isPublic', coalesce(reported.is_public, false),
      'adminRole', reported_admin.role
    ),
    'messageContext', case
      when report.message_id is null then '[]'::jsonb
      else coalesce((
        select jsonb_agg(to_jsonb(message_context) order by message_context.created_at)
        from (
          (
            select
              message.id,
              message.sender_id,
              message.body,
              message.created_at,
              message.id = report.message_id as is_reported
            from public.messages as message
            inner join public.messages as target_message
              on target_message.id = report.message_id
            where message.conversation_id = report.conversation_id
              and message.created_at <= target_message.created_at
            order by message.created_at desc
            limit 6
          )
          union all
          (
            select
              message.id,
              message.sender_id,
              message.body,
              message.created_at,
              false
            from public.messages as message
            inner join public.messages as target_message
              on target_message.id = report.message_id
            where message.conversation_id = report.conversation_id
              and message.created_at > target_message.created_at
            order by message.created_at asc
            limit 5
          )
        ) as message_context
      ), '[]'::jsonb)
    end
  )
  into v_result
  from public.user_reports as report
  left join public.profiles as reporter on reporter.id = report.reporter_id
  left join public.profiles as reported
    on reported.id = report.reported_user_id
  left join public.personas as reported_persona
    on reported_persona.user_id = report.reported_user_id
  left join public.user_moderation_status as moderation
    on moderation.user_id = report.reported_user_id
  left join public.admin_users as reported_admin
    on reported_admin.user_id = report.reported_user_id
  where report.id = target_report_id;

  return v_result;
end;
$$;

revoke all on function public.admin_get_report_detail(uuid)
from public, anon;
grant execute on function public.admin_get_report_detail(uuid)
to authenticated;

create or replace function public.admin_list_audit_logs()
returns table (
  log_id uuid,
  admin_user_id uuid,
  action text,
  target_user_id uuid,
  target_report_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := public.admin_assert_access();

  if v_role not in ('admin', 'super_admin') then
    raise exception using
      errcode = 'P0001',
      message = 'senior_admin_required';
  end if;

  return query
  select
    audit.id,
    audit.admin_user_id,
    audit.action,
    audit.target_user_id,
    audit.target_report_id,
    audit.metadata,
    audit.created_at
  from public.admin_audit_logs as audit
  order by audit.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_audit_logs()
from public, anon;
grant execute on function public.admin_list_audit_logs()
to authenticated;

create or replace function public.admin_update_user_status(
  target_user_id uuid,
  new_status text,
  reason text default null,
  suspended_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_admin_role text;
  v_target_role text;
  v_reason text := nullif(btrim(reason), '');
  v_previous_status text;
begin
  v_admin_role := public.admin_assert_access();

  if target_user_id is null or target_user_id = v_admin_id then
    raise exception using
      errcode = 'P0001',
      message = 'self_admin_action';
  end if;

  if new_status not in ('active', 'restricted', 'suspended', 'banned') then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_status';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'moderation_reason_required';
  end if;

  if new_status = 'suspended'
    and (suspended_until is null or suspended_until <= now()) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_suspension';
  end if;

  select administrator.role
  into v_target_role
  from public.admin_users as administrator
  where administrator.user_id = target_user_id;

  if public.admin_role_rank(v_admin_role)
    <= public.admin_role_rank(v_target_role) then
    raise exception using
      errcode = 'P0001',
      message = 'admin_hierarchy_violation';
  end if;

  select moderation.status
  into v_previous_status
  from public.user_moderation_status as moderation
  where moderation.user_id = target_user_id;

  insert into public.user_moderation_status (
    user_id,
    status,
    reason,
    suspended_until
  )
  values (
    target_user_id,
    new_status,
    case when new_status = 'active' then null else v_reason end,
    case when new_status = 'suspended' then suspended_until else null end
  )
  on conflict (user_id) do update
  set
    status = excluded.status,
    reason = excluded.reason,
    suspended_until = excluded.suspended_until,
    updated_at = now();

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    v_admin_id,
    'user_status_changed',
    target_user_id,
    pg_catalog.jsonb_build_object(
      'previousStatus', coalesce(v_previous_status, 'active'),
      'newStatus', new_status,
      'reason', v_reason,
      'suspendedUntil', case
        when new_status = 'suspended' then suspended_until
        else null
      end
    )
  );
end;
$$;

revoke all on function public.admin_update_user_status(
  uuid, text, text, timestamptz
) from public, anon;
grant execute on function public.admin_update_user_status(
  uuid, text, text, timestamptz
) to authenticated;

create or replace function public.admin_update_report_status(
  target_report_id uuid,
  new_status text,
  admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_note text := nullif(btrim(admin_note), '');
  v_previous_status text;
  v_previous_note text;
begin
  perform public.admin_assert_access();

  if new_status not in ('pending', 'reviewing', 'resolved', 'dismissed') then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_status';
  end if;

  if v_note is null or char_length(v_note) > 1000 then
    raise exception using
      errcode = 'P0001',
      message = 'admin_note_too_long';
  end if;

  select report.status, report.admin_note
  into v_previous_status, v_previous_note
  from public.user_reports as report
  where report.id = target_report_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'report_not_found';
  end if;

  update public.user_reports
  set
    status = new_status,
    admin_note = v_note,
    reviewed_at = now(),
    reviewed_by = v_admin_id
  where id = target_report_id;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_report_id,
    metadata
  )
  values (
    v_admin_id,
    case
      when v_previous_status = new_status
        and v_previous_note is distinct from v_note
        then 'admin_note_changed'
      else 'report_status_changed'
    end,
    target_report_id,
    pg_catalog.jsonb_build_object(
      'previousStatus', v_previous_status,
      'newStatus', new_status,
      'noteChanged', v_previous_note is distinct from v_note
    )
  );
end;
$$;

revoke all on function public.admin_update_report_status(
  uuid, text, text
) from public, anon;
grant execute on function public.admin_update_report_status(
  uuid, text, text
) to authenticated;

create or replace function public.admin_disable_public_profile(
  target_user_id uuid,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_admin_role text;
  v_target_role text;
  v_reason text := nullif(btrim(reason), '');
begin
  v_admin_role := public.admin_assert_access();

  if target_user_id is null or target_user_id = v_admin_id then
    raise exception using
      errcode = 'P0001',
      message = 'self_admin_action';
  end if;

  if v_reason is null or char_length(v_reason) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'moderation_reason_required';
  end if;

  select administrator.role
  into v_target_role
  from public.admin_users as administrator
  where administrator.user_id = target_user_id;

  if public.admin_role_rank(v_admin_role)
    <= public.admin_role_rank(v_target_role) then
    raise exception using
      errcode = 'P0001',
      message = 'admin_hierarchy_violation';
  end if;

  update public.profiles
  set is_public = false
  where id = target_user_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'user_not_found';
  end if;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    v_admin_id,
    'public_profile_disabled',
    target_user_id,
    pg_catalog.jsonb_build_object('reason', v_reason)
  );
end;
$$;

revoke all on function public.admin_disable_public_profile(uuid, text)
from public, anon;
grant execute on function public.admin_disable_public_profile(uuid, text)
to authenticated;

-- Character-support tools. These are intentionally server-side admin RPCs:
-- users cannot clear their own canonical ID or alter their analysis quota.
alter table public.admin_audit_logs
drop constraint if exists admin_audit_action_valid;
alter table public.admin_audit_logs
add constraint admin_audit_action_valid
check (
  action in (
    'user_status_changed',
    'report_status_changed',
    'public_profile_disabled',
    'admin_note_changed',
    'persona_identity_cleared',
    'persona_reanalysis_granted'
  )
);

create or replace function public.admin_assert_can_manage_user(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_admin_role text;
  v_target_role text;
begin
  v_admin_role := public.admin_assert_access();

  if target_user_id is null or target_user_id = v_admin_id then
    raise exception using
      errcode = 'P0001',
      message = 'self_admin_action';
  end if;

  if not exists (
    select 1 from public.profiles as profile
    where profile.id = target_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'user_not_found';
  end if;

  select administrator.role
  into v_target_role
  from public.admin_users as administrator
  where administrator.user_id = target_user_id;

  if public.admin_role_rank(v_admin_role)
    <= coalesce(public.admin_role_rank(v_target_role), 0) then
    raise exception using
      errcode = 'P0001',
      message = 'admin_hierarchy_violation';
  end if;
end;
$$;

revoke all on function public.admin_assert_can_manage_user(uuid)
from public, anon, authenticated;

create or replace function public.admin_clear_persona_identity(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_previous_identity text;
begin
  perform public.admin_assert_can_manage_user(target_user_id);

  select public_nickname
  into v_previous_identity
  from public.profiles
  where id = target_user_id
  for update;

  update public.profiles
  set public_nickname = null
  where id = target_user_id;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    v_admin_id,
    'persona_identity_cleared',
    target_user_id,
    pg_catalog.jsonb_build_object(
      'hadIdentity', v_previous_identity is not null
    )
  );
end;
$$;

revoke all on function public.admin_clear_persona_identity(uuid)
from public, anon;
grant execute on function public.admin_clear_persona_identity(uuid)
to authenticated;

create or replace function public.admin_grant_persona_reanalysis(
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_restored_log_id uuid;
begin
  perform public.admin_assert_can_manage_user(target_user_id);

  v_day_start := (
    pg_catalog.date_trunc('day', now() at time zone 'Asia/Seoul')
    at time zone 'Asia/Seoul'
  );
  v_day_end := v_day_start + interval '1 day';

  delete from public.persona_analysis_logs
  where id = (
    select log.id
    from public.persona_analysis_logs as log
    where log.user_id = target_user_id
      and log.request_kind = 'force'
      and log.status in ('completed', 'failed')
      and log.requested_at >= v_day_start
      and log.requested_at < v_day_end
    order by log.requested_at asc
    limit 1
    for update
  )
  returning id into v_restored_log_id;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    v_admin_id,
    'persona_reanalysis_granted',
    target_user_id,
    pg_catalog.jsonb_build_object(
      'restoredUse', v_restored_log_id is not null
    )
  );

  return v_restored_log_id is not null;
end;
$$;

revoke all on function public.admin_grant_persona_reanalysis(uuid)
from public, anon;
grant execute on function public.admin_grant_persona_reanalysis(uuid)
to authenticated;

notify pgrst, 'reload schema';

-- TODO(group-chat): apply the same moderation checks to future group-room
-- membership and send RPCs before enabling small group conversations.
