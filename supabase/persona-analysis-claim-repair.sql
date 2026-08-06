-- Repairs the analysis-claim RPC used by /api/analyze-persona.
-- Run this in the cacamioeisdhizvpspzf Supabase SQL Editor.
-- Prerequisite: supabase/personas.sql was run at least once.

create or replace function public.claim_persona_analysis(
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_log_id uuid;
  v_force_count integer;
  v_is_reanalysis boolean;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if not p_force and exists (
    select 1 from public.personas where user_id = v_user_id
  ) then
    return pg_catalog.jsonb_build_object('status', 'cached');
  end if;

  if exists (
    select 1
    from public.persona_analysis_logs
    where user_id = v_user_id
      and status = 'started'
      and requested_at > now() - interval '2 minutes'
  ) then
    return pg_catalog.jsonb_build_object('status', 'in_progress');
  end if;

  v_is_reanalysis := p_force or exists (
    select 1
    from public.persona_analysis_logs
    where user_id = v_user_id and status = 'completed'
  );

  if v_is_reanalysis then
    v_day_start := (
      pg_catalog.date_trunc('day', now() at time zone 'Asia/Seoul')
      at time zone 'Asia/Seoul'
    );
    v_day_end := v_day_start + interval '1 day';

    select count(*)::integer
    into v_force_count
    from public.persona_analysis_logs
    where user_id = v_user_id
      and request_kind = 'force'
      and requested_at >= v_day_start
      and requested_at < v_day_end;

    if v_force_count >= 2 then
      return pg_catalog.jsonb_build_object(
        'status', 'rate_limited', 'remaining', 0
      );
    end if;
  end if;

  insert into public.persona_analysis_logs (user_id, request_kind)
  values (
    v_user_id,
    case when v_is_reanalysis then 'force' else 'initial' end
  )
  returning id into v_log_id;

  return pg_catalog.jsonb_build_object(
    'status', 'allowed',
    'log_id', v_log_id,
    'remaining', case
      when v_is_reanalysis then greatest(0, 1 - v_force_count)
      else 2
    end
  );
end;
$$;

revoke all on function public.claim_persona_analysis(boolean) from public;
revoke all on function public.claim_persona_analysis(boolean) from anon;
grant execute on function public.claim_persona_analysis(boolean) to authenticated;

notify pgrst, 'reload schema';
