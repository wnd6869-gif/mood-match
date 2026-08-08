-- Fetch a bounded discovery page at the database boundary. The client keeps
-- scoring only this page, rather than loading every public profile first.
drop function if exists public.discover_available_chat_profiles(
  uuid, text, text, text, boolean, text
);

create function public.discover_available_chat_profiles(
  p_target_user_id uuid default null,
  p_goal text default null,
  p_mood text default null,
  p_topic text default null,
  p_one_to_one_only boolean default false,
  p_time_slot text default null,
  p_limit integer default 24,
  p_cursor_updated_at timestamptz default null,
  p_cursor_user_id uuid default null
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
  available_time_slots text[],
  request_id uuid,
  request_status text,
  request_direction text,
  profile_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select discoverable_profile.*, profile.updated_at as profile_updated_at
  from public.discover_public_chat_profiles(
    p_target_user_id, p_goal, p_mood, p_topic, p_one_to_one_only, p_time_slot
  ) as discoverable_profile
  inner join public.profiles as profile
    on profile.id = discoverable_profile.user_id
  where public.is_user_operational(discoverable_profile.user_id)
    and not exists (
      select 1 from public.user_blocks as blocked_pair
      where (
        blocked_pair.blocker_id = (select auth.uid())
        and blocked_pair.blocked_id = discoverable_profile.user_id
      ) or (
        blocked_pair.blocker_id = discoverable_profile.user_id
        and blocked_pair.blocked_id = (select auth.uid())
      )
    )
    and (
      p_cursor_updated_at is null
      or profile.updated_at < p_cursor_updated_at
      or (profile.updated_at = p_cursor_updated_at and profile.id < p_cursor_user_id)
    )
  order by profile.updated_at desc, profile.id desc
  limit least(greatest(coalesce(p_limit, 24), 1), 40);
$$;

revoke all on function public.discover_available_chat_profiles(
  uuid, text, text, text, boolean, text, integer, timestamptz, uuid
) from public, anon;
grant execute on function public.discover_available_chat_profiles(
  uuid, text, text, text, boolean, text, integer, timestamptz, uuid
) to authenticated;

create index if not exists profiles_discover_cursor_idx
  on public.profiles (updated_at desc, id desc)
  where is_public = true;
