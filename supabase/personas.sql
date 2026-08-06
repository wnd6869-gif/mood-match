-- Run this file manually in the Supabase SQL Editor.
-- It is intentionally not executed by the application.

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  photo_path text not null,
  animal_types jsonb not null,
  mood_keywords jsonb not null,
  persona_title text not null,
  persona_description text not null,
  nickname_candidates jsonb not null,
  visual_traits jsonb null,
  model_name text null,
  input_tokens integer null,
  output_tokens integer null,
  total_tokens integer null,
  analysis_source text not null default 'openai',
  created_at timestamptz not null default now(),
  constraint personas_animal_types_array
    check (jsonb_typeof(animal_types) = 'array'),
  constraint personas_mood_keywords_array
    check (jsonb_typeof(mood_keywords) = 'array'),
  constraint personas_nickname_candidates_array
    check (jsonb_typeof(nickname_candidates) = 'array'),
  constraint personas_visual_traits_object
    check (
      visual_traits is null
      or (
        jsonb_typeof(visual_traits) = 'object'
        and visual_traits ?& array[
          'friendly',
          'cute',
          'calm',
          'playful',
          'stylish',
          'reliable'
        ]
      )
    ),
  constraint personas_token_counts_nonnegative
    check (
      (input_tokens is null or input_tokens >= 0)
      and (output_tokens is null or output_tokens >= 0)
      and (total_tokens is null or total_tokens >= 0)
    )
);

create unique index if not exists personas_user_id_key
  on public.personas (user_id);

alter table public.personas enable row level security;

drop policy if exists "Users can view their own persona" on public.personas;
create policy "Users can view their own persona"
on public.personas
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own persona" on public.personas;
create policy "Users can create their own persona"
on public.personas
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own persona" on public.personas;
create policy "Users can update their own persona"
on public.personas
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own persona" on public.personas;
create policy "Users can delete their own persona"
on public.personas
for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.personas to authenticated;
revoke all on table public.personas from anon;

-- This log is the server/database source of truth for duplicate prevention and
-- the daily force-analysis limit. Direct writes are intentionally not granted.
create table if not exists public.persona_analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_kind text not null
    check (request_kind in ('initial', 'force')),
  status text not null default 'started'
    check (status in ('started', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists persona_analysis_logs_user_requested_idx
on public.persona_analysis_logs (user_id, requested_at desc);

alter table public.persona_analysis_logs enable row level security;

drop policy if exists "Users can view their own analysis logs"
on public.persona_analysis_logs;
create policy "Users can view their own analysis logs"
on public.persona_analysis_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on table public.persona_analysis_logs to authenticated;
revoke insert, update, delete on table public.persona_analysis_logs
from authenticated;
revoke all on table public.persona_analysis_logs from anon;

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
    select 1
    from public.personas
    where user_id = v_user_id
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
    where user_id = v_user_id
      and status = 'completed'
  );

  if v_is_reanalysis then
    v_day_start := (
      pg_catalog.date_trunc(
        'day',
        now() at time zone 'Asia/Seoul'
      ) at time zone 'Asia/Seoul'
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
        'status',
        'rate_limited',
        'remaining',
        0
      );
    end if;
  end if;

  insert into public.persona_analysis_logs (
    user_id,
    request_kind
  )
  values (
    v_user_id,
    case when v_is_reanalysis then 'force' else 'initial' end
  )
  returning id into v_log_id;

  return pg_catalog.jsonb_build_object(
    'status',
    'allowed',
    'log_id',
    v_log_id,
    'remaining',
    case
      when v_is_reanalysis then greatest(0, 1 - v_force_count)
      else 2
    end
  );
end;
$$;

create or replace function public.complete_persona_analysis(
  p_log_id uuid,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.persona_analysis_logs
  set
    status = case when p_succeeded then 'completed' else 'failed' end,
    completed_at = now()
  where id = p_log_id
    and user_id = v_user_id
    and status = 'started';
end;
$$;

create or replace function public.cancel_persona_analysis(
  p_log_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.persona_analysis_logs
  where id = p_log_id
    and user_id = v_user_id
    and status = 'started';
end;
$$;

revoke all on function public.claim_persona_analysis(boolean) from public;
revoke all on function public.claim_persona_analysis(boolean) from anon;
grant execute on function public.claim_persona_analysis(boolean)
to authenticated;

revoke all on function public.complete_persona_analysis(uuid, boolean)
from public;
revoke all on function public.complete_persona_analysis(uuid, boolean)
from anon;
grant execute on function public.complete_persona_analysis(uuid, boolean)
to authenticated;

revoke all on function public.cancel_persona_analysis(uuid) from public;
revoke all on function public.cancel_persona_analysis(uuid) from anon;
grant execute on function public.cancel_persona_analysis(uuid)
to authenticated;
