-- Run this file manually in the Supabase SQL Editor.
-- It extends the existing profiles table without replacing existing data.

alter table public.profiles
  add column if not exists public_nickname text null,
  add column if not exists public_bio text null,
  add column if not exists is_public boolean not null default false,
  add column if not exists age_visibility text not null default 'range',
  add column if not exists photo_visibility text not null default 'persona_only',
  add column if not exists conversation_goal text null,
  add column if not exists conversation_moods text[] not null default '{}'::text[],
  add column if not exists conversation_topics text[] not null default '{}'::text[],
  add column if not exists conversation_pace text null,
  add column if not exists preferred_group_size text null,
  add column if not exists available_time_slots text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_public_nickname_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_nickname_valid
      check (
        public_nickname is null
        or (
          public_nickname = btrim(public_nickname)
          and char_length(public_nickname) between 2 and 20
          and lower(regexp_replace(public_nickname, '\s', '', 'g'))
            !~ '(관리자|운영자|admin|official|시발|씨발|개새끼)'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_public_bio_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_bio_valid
      check (
        public_bio is null
        or (
          public_bio = btrim(public_bio)
          and char_length(public_bio) <= 120
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_public_requires_nickname'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_requires_nickname
      check (not is_public or public_nickname is not null);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_age_visibility_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_age_visibility_valid
      check (age_visibility in ('hidden', 'range', 'exact'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_photo_visibility_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_photo_visibility_valid
      check (photo_visibility in ('persona_only', 'mutual', 'public'));
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_conversation_goal_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_conversation_goal_valid
      check (
        conversation_goal is null
        or conversation_goal in (
          'casual_chat',
          'hobby_chat',
          '고민_나누기',
          'new_friends',
          'relationship_open'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_conversation_moods_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_conversation_moods_valid
      check (
        cardinality(conversation_moods) <= 4
        and conversation_moods <@ array[
          '편안한',
          '유쾌한',
          '차분한',
          '다정한',
          '솔직한',
          '깊이있는',
          '가벼운',
          '늦은밤감성'
        ]::text[]
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_conversation_topics_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_conversation_topics_valid
      check (
        cardinality(conversation_topics) <= 6
        and conversation_topics <@ array[
          '일상',
          '음악',
          '영화드라마',
          '여행',
          '음식',
          '운동',
          '게임',
          '책',
          '연애',
          '고민',
          '직장',
          '아무말'
        ]::text[]
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_conversation_pace_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_conversation_pace_valid
      check (
        conversation_pace is null
        or conversation_pace in ('slow', 'balanced', 'fast')
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_preferred_group_size_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_group_size_valid
      check (
        preferred_group_size is null
        or preferred_group_size in ('one_to_one', 'small_group', 'both')
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_available_time_slots_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_available_time_slots_valid
      check (
        cardinality(available_time_slots) <= 4
        and available_time_slots <@ array[
          'morning',
          'daytime',
          'evening',
          'late_night'
        ]::text[]
      );
  end if;
end
$$;

-- Existing profiles RLS and self-access policies are intentionally unchanged.
-- This RPC validates every required conversation preference on the database.
create or replace function public.save_conversation_preferences(
  p_conversation_goal text,
  p_conversation_moods text[],
  p_conversation_topics text[],
  p_conversation_pace text,
  p_preferred_group_size text,
  p_available_time_slots text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if p_conversation_goal is null
    or p_conversation_goal not in (
      'casual_chat',
      'hobby_chat',
      '고민_나누기',
      'new_friends',
      'relationship_open'
    ) then
    raise exception 'invalid conversation goal';
  end if;

  if coalesce(cardinality(p_conversation_moods), 0) not between 1 and 4
    or not (
      p_conversation_moods <@ array[
        '편안한',
        '유쾌한',
        '차분한',
        '다정한',
        '솔직한',
        '깊이있는',
        '가벼운',
        '늦은밤감성'
      ]::text[]
    )
    or cardinality(p_conversation_moods) <> (
      select count(distinct selected_mood.value)
      from unnest(p_conversation_moods) as selected_mood(value)
    ) then
    raise exception 'invalid conversation moods';
  end if;

  if coalesce(cardinality(p_conversation_topics), 0) not between 1 and 6
    or not (
      p_conversation_topics <@ array[
        '일상',
        '음악',
        '영화드라마',
        '여행',
        '음식',
        '운동',
        '게임',
        '책',
        '연애',
        '고민',
        '직장',
        '아무말'
      ]::text[]
    )
    or cardinality(p_conversation_topics) <> (
      select count(distinct selected_topic.value)
      from unnest(p_conversation_topics) as selected_topic(value)
    ) then
    raise exception 'invalid conversation topics';
  end if;

  if p_conversation_pace is null
    or p_conversation_pace not in ('slow', 'balanced', 'fast') then
    raise exception 'invalid conversation pace';
  end if;

  if p_preferred_group_size is null
    or p_preferred_group_size not in (
      'one_to_one',
      'small_group',
      'both'
    ) then
    raise exception 'invalid preferred group size';
  end if;

  if coalesce(cardinality(p_available_time_slots), 0) not between 1 and 4
    or not (
      p_available_time_slots <@ array[
        'morning',
        'daytime',
        'evening',
        'late_night'
      ]::text[]
    )
    or cardinality(p_available_time_slots) <> (
      select count(distinct selected_time.value)
      from unnest(p_available_time_slots) as selected_time(value)
    ) then
    raise exception 'invalid available time slots';
  end if;

  update public.profiles
  set
    conversation_goal = p_conversation_goal,
    conversation_moods = p_conversation_moods,
    conversation_topics = p_conversation_topics,
    conversation_pace = p_conversation_pace,
    preferred_group_size = p_preferred_group_size,
    available_time_slots = p_available_time_slots
  where id = v_user_id;

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke all on function public.save_conversation_preferences(
  text,
  text[],
  text[],
  text,
  text,
  text[]
) from public;
revoke all on function public.save_conversation_preferences(
  text,
  text[],
  text[],
  text,
  text,
  text[]
) from anon;
grant execute on function public.save_conversation_preferences(
  text,
  text[],
  text[],
  text,
  text,
  text[]
) to authenticated;

-- Authenticated users can discover only active public profiles through this
-- restricted RPC. It never returns email, raw birth date/time, gender, or
-- private persona metadata such as token usage and the Storage object path.
create or replace function public.get_public_chat_profiles(
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  public_nickname text,
  public_bio text,
  persona_title text,
  persona_description text,
  animal_types jsonb,
  mood_keywords jsonb,
  age_display text,
  photo_visibility text,
  conversation_goal text,
  conversation_moods text[],
  conversation_topics text[],
  conversation_pace text,
  preferred_group_size text,
  available_time_slots text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id as user_id,
    profile.public_nickname,
    profile.public_bio,
    persona.persona_title,
    persona.persona_description,
    persona.animal_types,
    persona.mood_keywords,
    case
      when profile.age_visibility = 'hidden'
        or profile.birth_date is null then null
      when profile.age_visibility = 'exact' then
        (
          extract(
            year from pg_catalog.age(
              (pg_catalog.now() at time zone 'Asia/Seoul')::date,
              profile.birth_date
            )
          )::integer
        )::text || '세'
      else
        (
          (
            extract(
              year from pg_catalog.age(
                (pg_catalog.now() at time zone 'Asia/Seoul')::date,
                profile.birth_date
              )
            )::integer / 10
          ) * 10
        )::text || '대'
    end as age_display,
    profile.photo_visibility,
    profile.conversation_goal,
    profile.conversation_moods,
    profile.conversation_topics,
    profile.conversation_pace,
    profile.preferred_group_size,
    profile.available_time_slots
  from public.profiles as profile
  inner join public.personas as persona
    on persona.user_id = profile.id
  where profile.is_public = true
    and profile.public_nickname is not null
    and profile.conversation_goal is not null
    and cardinality(profile.conversation_moods) between 1 and 4
    and cardinality(profile.conversation_topics) between 1 and 6
    and profile.conversation_pace is not null
    and profile.preferred_group_size is not null
    and cardinality(profile.available_time_slots) between 1 and 4
    and (
      p_user_id is null
      or profile.id = p_user_id
    )
  order by profile.updated_at desc;
$$;

revoke all on function public.get_public_chat_profiles(uuid) from public;
revoke all on function public.get_public_chat_profiles(uuid) from anon;
grant execute on function public.get_public_chat_profiles(uuid)
to authenticated;
