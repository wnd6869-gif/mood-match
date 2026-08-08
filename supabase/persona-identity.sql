-- Run this migration after profiles.sql, public-chat-profile.sql, and
-- personas.sql.
--
-- public_nickname is retained as the legacy column name, but now represents
-- the account's canonical AI-generated ID. It is assigned once and reused by
-- the public profile instead of being independently editable.

-- Make any pre-existing duplicate public nicknames unique before adding the
-- database constraint. Existing names remain stable unless they collide.
with ranked_identities as (
  select
    profile.id,
    row_number() over (
      partition by lower(
        pg_catalog.regexp_replace(profile.public_nickname, '\s+', '', 'g')
      )
      order by profile.created_at, profile.id
    ) as duplicate_rank
  from public.profiles as profile
  where profile.public_nickname is not null
)
update public.profiles as profile
set public_nickname =
  left(profile.public_nickname, 12)
  || substr(replace(profile.id::text, '-', ''), 1, 8)
from ranked_identities as ranked
where ranked.id = profile.id
  and ranked.duplicate_rank > 1;

create unique index if not exists profiles_persona_identity_unique
on public.profiles (
  lower(pg_catalog.regexp_replace(public_nickname, '\s+', '', 'g'))
)
where public_nickname is not null;

create or replace function public.assign_persona_identity(
  target_user_id uuid,
  identity_candidates jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing text;
  v_candidate text;
  v_base text := '다정하고 특별한 친구';
  v_assigned text;
  v_suffix text;
begin
  select profile.public_nickname
  into v_existing
  from public.profiles as profile
  where profile.id = target_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'profile_required';
  end if;

  if v_existing is not null then
    return v_existing;
  end if;

  if pg_catalog.jsonb_typeof(identity_candidates) = 'array' then
    for v_candidate in
      select btrim(candidate.value)
      from pg_catalog.jsonb_array_elements_text(
        identity_candidates
      ) as candidate(value)
    loop
      v_candidate := pg_catalog.regexp_replace(
        v_candidate,
        '\s+',
        ' ',
        'g'
      );

      if v_candidate !~ '^[가-힣]{1,8} [가-힣]{1,8} [가-힣]{1,8}$'
        and v_candidate ~ '[가-힣]' then
        v_candidate :=
          '다정하고 특별한 '
          || left(
            pg_catalog.regexp_replace(v_candidate, '\s+', '', 'g'),
            8
          );
      end if;

      if v_candidate ~ '^[가-힣]{1,8} [가-힣]{1,8} [가-힣]{1,8}$'
        and char_length(v_candidate) between 5 and 20 then
        if v_base = '다정하고 특별한 친구' then
          v_base := v_candidate;
        end if;

        begin
          update public.profiles
          set public_nickname = v_candidate
          where id = target_user_id
            and public_nickname is null
          returning public_nickname into v_assigned;

          if v_assigned is not null then
            return v_assigned;
          end if;
        exception
          when unique_violation then
            null;
        end;
      end if;
    end loop;
  end if;

  -- The deterministic suffix is only used when all three generated IDs are
  -- already occupied. The unique index remains the final concurrency guard.
  for v_suffix in
    select substr(
      pg_catalog.md5(target_user_id::text || suffix_attempt::text),
      1,
      5
    )
    from pg_catalog.generate_series(0, 9) as suffix_attempt
  loop
    v_candidate := left(v_base, 14) || v_suffix;

    begin
      update public.profiles
      set public_nickname = v_candidate
      where id = target_user_id
        and public_nickname is null
      returning public_nickname into v_assigned;

      if v_assigned is not null then
        return v_assigned;
      end if;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception using
    errcode = 'P0001',
    message = 'identity_assignment_failed';
end;
$$;

revoke all on function public.assign_persona_identity(uuid, jsonb)
from public, anon, authenticated;

-- A new photo analysis is a new character identity. Keep the initial
-- assignment stable, but intentionally replace it when the analysis updates
-- its generated nickname candidates.
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
    raise exception using
      errcode = 'P0001',
      message = 'profile_required';
  end if;

  -- Never clear a public ID while replacing it. The profile constraint
  -- requires a nickname whenever the account is public.
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
          when unique_violation or check_violation then
            null;
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
      when unique_violation or check_violation then
        null;
    end;
  end loop;

  raise exception using
    errcode = 'P0001',
    message = 'identity_assignment_failed';
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

-- Backfill accounts that already completed analysis before this migration.
do $$
declare
  existing_persona record;
begin
  for existing_persona in
    select persona.user_id, persona.nickname_candidates
    from public.personas as persona
    inner join public.profiles as profile
      on profile.id = persona.user_id
    where profile.public_nickname is null
    order by persona.created_at, persona.user_id
  loop
    perform public.assign_persona_identity(
      existing_persona.user_id,
      existing_persona.nickname_candidates
    );
  end loop;
end;
$$;

-- Authenticated clients may edit profile facts and visibility settings, but
-- the canonical AI ID can only be written by the assignment function above.
revoke insert, update on table public.profiles from authenticated;
grant insert (
  id,
  nickname,
  birth_date,
  gender,
  preferred_gender,
  birth_time,
  birth_time_unknown
) on table public.profiles to authenticated;
grant update (
  nickname,
  birth_date,
  gender,
  preferred_gender,
  birth_time,
  birth_time_unknown,
  public_bio,
  is_public,
  age_visibility,
  photo_visibility,
  conversation_goal,
  conversation_moods,
  conversation_topics,
  conversation_pace,
  preferred_group_size,
  available_time_slots,
  updated_at
) on table public.profiles to authenticated;
