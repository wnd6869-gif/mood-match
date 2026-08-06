-- The conversation-first onboarding profile deliberately collects only the
-- information used for filtering and common-ground suggestions. Existing
-- profiles remain readable; this validation applies whenever a user saves.
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

  if p_conversation_goal not in ('casual_chat', 'hobby_chat', 'relationship_open') then
    raise exception 'invalid conversation goal';
  end if;

  -- Mood remains an internal compatibility field. It must retain one of the
  -- existing valid values, while the onboarding UI no longer asks for it.
  if coalesce(cardinality(p_conversation_moods), 0) not between 1 and 4
    or cardinality(p_conversation_moods) <> (
      select count(distinct selected_mood.value)
      from unnest(p_conversation_moods) as selected_mood(value)
    ) then
    raise exception 'invalid conversation moods';
  end if;

  if coalesce(cardinality(p_conversation_topics), 0) not between 3 and 5
    or cardinality(p_conversation_topics) <> (
      select count(distinct selected_topic.value)
      from unnest(p_conversation_topics) as selected_topic(value)
    ) then
    raise exception 'invalid conversation topics';
  end if;

  if p_conversation_pace not in ('slow', 'fast') then
    raise exception 'invalid conversation pace';
  end if;

  if p_preferred_group_size <> 'one_to_one' then
    raise exception 'invalid preferred group size';
  end if;

  if coalesce(cardinality(p_available_time_slots), 0) not between 1 and 3
    or not (p_available_time_slots <@ array['daytime', 'evening', 'late_night']::text[])
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

revoke all on function public.save_conversation_preferences(text, text[], text[], text, text, text[]) from public, anon;
grant execute on function public.save_conversation_preferences(text, text[], text[], text, text, text[]) to authenticated;
