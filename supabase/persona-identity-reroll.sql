-- Reassign the canonical AI ID whenever a successful new photo analysis
-- stores a different nickname_candidates value. Run after persona-identity.sql.

create or replace function public.refresh_persona_identity(
  target_user_id uuid,
  identity_candidates jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_identity text;
  v_next_candidates jsonb;
begin
  select public_nickname
  into v_previous_identity
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'profile_required';
  end if;

  update public.profiles
  set public_nickname = null
  where id = target_user_id;

  select coalesce(
    pg_catalog.jsonb_agg(candidate.value),
    '[]'::jsonb
  )
  into v_next_candidates
  from pg_catalog.jsonb_array_elements_text(
    coalesce(identity_candidates, '[]'::jsonb)
  ) as candidate(value)
  where v_previous_identity is null
    or lower(pg_catalog.regexp_replace(candidate.value, '\s+', '', 'g'))
      <> lower(pg_catalog.regexp_replace(v_previous_identity, '\s+', '', 'g'));

  return public.assign_persona_identity(
    target_user_id,
    v_next_candidates
  );
end;
$$;

revoke all on function public.refresh_persona_identity(uuid, jsonb)
from public, anon, authenticated;

create or replace function public.assign_persona_identity_after_analysis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' then
    perform public.refresh_persona_identity(
      new.user_id,
      new.nickname_candidates
    );
  else
    perform public.assign_persona_identity(
      new.user_id,
      new.nickname_candidates
    );
  end if;

  return new;
end;
$$;

revoke all on function public.assign_persona_identity_after_analysis()
from public, anon, authenticated;

drop trigger if exists assign_persona_identity_after_analysis
on public.personas;
create trigger assign_persona_identity_after_analysis
after insert or update of nickname_candidates
on public.personas
for each row
execute function public.assign_persona_identity_after_analysis();

notify pgrst, 'reload schema';
