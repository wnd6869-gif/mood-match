-- Run after admin.sql and personas.sql.
-- Adds audited administrator actions for clearing an AI ID and restoring one
-- of today's completed/failed reanalysis uses.

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
    raise exception using errcode = 'P0001', message = 'self_admin_action';
  end if;

  if not exists (
    select 1 from public.profiles as profile where profile.id = target_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'user_not_found';
  end if;

  select administrator.role into v_target_role
  from public.admin_users as administrator
  where administrator.user_id = target_user_id;

  if public.admin_role_rank(v_admin_role)
    <= coalesce(public.admin_role_rank(v_target_role), 0) then
    raise exception using
      errcode = 'P0001', message = 'admin_hierarchy_violation';
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

  select public_nickname into v_previous_identity
  from public.profiles where id = target_user_id for update;

  update public.profiles
  set public_nickname = null
  where id = target_user_id;

  insert into public.admin_audit_logs (
    admin_user_id, action, target_user_id, metadata
  ) values (
    v_admin_id,
    'persona_identity_cleared',
    target_user_id,
    pg_catalog.jsonb_build_object('hadIdentity', v_previous_identity is not null)
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
    admin_user_id, action, target_user_id, metadata
  ) values (
    v_admin_id,
    'persona_reanalysis_granted',
    target_user_id,
    pg_catalog.jsonb_build_object('restoredUse', v_restored_log_id is not null)
  );

  return v_restored_log_id is not null;
end;
$$;

revoke all on function public.admin_grant_persona_reanalysis(uuid)
from public, anon;
grant execute on function public.admin_grant_persona_reanalysis(uuid)
to authenticated;

notify pgrst, 'reload schema';
