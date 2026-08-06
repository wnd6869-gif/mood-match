-- Admin-only OpenAI analysis health metrics. Depends on the registered baseline.
create or replace function public.admin_persona_analysis_metrics(
  p_since timestamptz default now() - interval '24 hours'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested bigint;
  v_completed bigint;
  v_failed bigint;
  v_started bigint;
  v_input_tokens bigint;
  v_output_tokens bigint;
  v_total_tokens bigint;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*), count(*) filter (where status = 'completed'),
    count(*) filter (where status = 'failed'), count(*) filter (where status = 'started')
  into v_requested, v_completed, v_failed, v_started
  from public.persona_analysis_logs where requested_at >= p_since;

  select coalesce(sum(input_tokens), 0), coalesce(sum(output_tokens), 0), coalesce(sum(total_tokens), 0)
  into v_input_tokens, v_output_tokens, v_total_tokens
  from public.personas where created_at >= p_since and analysis_source = 'openai';

  return jsonb_build_object(
    'windowStartedAt', p_since, 'requested', v_requested, 'completed', v_completed,
    'failed', v_failed, 'inProgress', v_started,
    'failureRate', case when v_requested = 0 then 0 else round((v_failed::numeric / v_requested::numeric) * 100, 1) end,
    'inputTokens', v_input_tokens, 'outputTokens', v_output_tokens, 'totalTokens', v_total_tokens
  );
end;
$$;

revoke all on function public.admin_persona_analysis_metrics(timestamptz) from public, anon;
grant execute on function public.admin_persona_analysis_metrics(timestamptz) to authenticated;
notify pgrst, 'reload schema';
