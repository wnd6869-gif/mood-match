-- A public profile cannot temporarily have a null public_nickname. Replace
-- persona IDs atomically so a fresh photo analysis works for public accounts.

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
  v_candidate text;
  v_assigned text;
  v_suffix text;
begin
  select public_nickname
  into v_previous_identity
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'profile_required';
  end if;

  if pg_catalog.jsonb_typeof(identity_candidates) = 'array' then
    for v_candidate in
      select btrim(candidate.value)
      from pg_catalog.jsonb_array_elements_text(identity_candidates)
        as candidate(value)
    loop
      v_candidate := pg_catalog.regexp_replace(v_candidate, '\s+', ' ', 'g');

      if (v_previous_identity is null or lower(pg_catalog.regexp_replace(v_candidate, '\s+', '', 'g'))
          <> lower(pg_catalog.regexp_replace(v_previous_identity, '\s+', '', 'g')))
        and char_length(v_candidate) between 2 and 20 then
        begin
          update public.profiles
          set public_nickname = v_candidate
          where id = target_user_id
            and public_nickname is not distinct from v_previous_identity
          returning public_nickname into v_assigned;

          if v_assigned is not null then
            return v_assigned;
          end if;
        exception
          when unique_violation or check_violation then null;
        end;
      end if;
    end loop;
  end if;

  for v_suffix in
    select substr(pg_catalog.md5(target_user_id::text || suffix_attempt::text), 1, 5)
    from pg_catalog.generate_series(0, 9) as suffix_attempt
  loop
    v_candidate := left(coalesce(v_previous_identity, 'new character'), 14) || v_suffix;

    begin
      update public.profiles
      set public_nickname = v_candidate
      where id = target_user_id
        and public_nickname is not distinct from v_previous_identity
      returning public_nickname into v_assigned;

      if v_assigned is not null then
        return v_assigned;
      end if;
    exception
      when unique_violation or check_violation then null;
    end;
  end loop;

  raise exception using errcode = 'P0001', message = 'identity_assignment_failed';
end;
$$;

revoke all on function public.refresh_persona_identity(uuid, jsonb)
from public, anon, authenticated;

notify pgrst, 'reload schema';
