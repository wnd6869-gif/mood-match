-- Run this migration manually in the Supabase SQL Editor after:
-- direct-chat.sql.
--
-- It adds persistent, invite-by-connection group rooms for 3 to 6 members.
-- Existing direct conversations and messages remain unchanged.

alter table public.conversations
add column if not exists title text null;

alter table public.conversations
add column if not exists created_by uuid null
references auth.users (id) on delete set null;

alter table public.conversations
add column if not exists archived_at timestamptz null;

alter table public.conversation_members
add column if not exists role text not null default 'member';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'conversations_group_title_valid'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
    add constraint conversations_group_title_valid
    check (
      (
        type = 'direct'
        and title is null
      )
      or (
        type = 'group'
        and title = btrim(title)
        and char_length(title) between 2 and 30
      )
    );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'conversation_members_role_valid'
      and conrelid = 'public.conversation_members'::regclass
  ) then
    alter table public.conversation_members
    add constraint conversation_members_role_valid
    check (role in ('owner', 'admin', 'member'));
  end if;
end;
$$;

create unique index if not exists conversation_members_active_owner_idx
on public.conversation_members (conversation_id)
where role = 'owner' and left_at is null;

drop policy if exists "Active members can view messages"
on public.messages;
create policy "Active members can view messages since joining"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members as membership
    where membership.conversation_id = messages.conversation_id
      and membership.user_id = (select auth.uid())
      and membership.left_at is null
      and messages.created_at >= membership.joined_at
  )
);

create or replace function public.get_my_group_candidates()
returns table (
  user_id uuid,
  public_nickname text,
  persona_title text,
  mood_keywords jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (candidate_profile.id)
    candidate_profile.id as user_id,
    candidate_profile.public_nickname,
    candidate_persona.persona_title,
    candidate_persona.mood_keywords
  from public.profiles as candidate_profile
  left join public.personas as candidate_persona
    on candidate_persona.user_id = candidate_profile.id
  where candidate_profile.id <> (select auth.uid())
    and candidate_profile.is_public = true
    and candidate_profile.preferred_group_size in (
      'small_group',
      'both'
    )
    and exists (
      select 1
      from public.conversation_requests as accepted_request
      where accepted_request.status = 'accepted'
        and (
          (
            accepted_request.sender_id = (select auth.uid())
            and accepted_request.receiver_id = candidate_profile.id
          )
          or (
            accepted_request.receiver_id = (select auth.uid())
            and accepted_request.sender_id = candidate_profile.id
          )
        )
    )
    and not exists (
      select 1
      from public.user_blocks as blocked_pair
      where (
        blocked_pair.blocker_id = (select auth.uid())
        and blocked_pair.blocked_id = candidate_profile.id
      )
      or (
        blocked_pair.blocker_id = candidate_profile.id
        and blocked_pair.blocked_id = (select auth.uid())
      )
    )
  order by
    candidate_profile.id,
    candidate_profile.public_nickname nulls last;
$$;

revoke all on function public.get_my_group_candidates() from public;
revoke all on function public.get_my_group_candidates() from anon;
grant execute on function public.get_my_group_candidates()
to authenticated;

create or replace function public.create_group_conversation(
  room_title text,
  member_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_id uuid := (select auth.uid());
  v_title text := btrim(room_title);
  v_member_ids uuid[];
  v_all_member_ids uuid[];
  v_conversation_id uuid;
  v_message public.messages;
begin
  if v_creator_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if (
    v_title is null
    or char_length(v_title) < 2
    or char_length(v_title) > 30
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_group_title';
  end if;

  select coalesce(
    array_agg(distinct requested_member_id),
    array[]::uuid[]
  )
  into v_member_ids
  from unnest(coalesce(member_ids, array[]::uuid[]))
    as requested_member(requested_member_id)
  where requested_member_id is not null
    and requested_member_id <> v_creator_id;

  if cardinality(v_member_ids) < 2
    or cardinality(v_member_ids) > 5
  then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_group_size';
  end if;

  if (
    select count(*)
    from public.profiles as candidate_profile
    where candidate_profile.id = any(v_member_ids)
      and candidate_profile.is_public = true
      and candidate_profile.preferred_group_size in (
        'small_group',
        'both'
      )
      and exists (
        select 1
        from public.conversation_requests as accepted_request
        where accepted_request.status = 'accepted'
          and (
            (
              accepted_request.sender_id = v_creator_id
              and accepted_request.receiver_id = candidate_profile.id
            )
            or (
              accepted_request.receiver_id = v_creator_id
              and accepted_request.sender_id = candidate_profile.id
            )
          )
      )
  ) <> cardinality(v_member_ids) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_group_members';
  end if;

  v_all_member_ids := array_prepend(v_creator_id, v_member_ids);

  if exists (
    select 1
    from public.user_blocks as blocked_pair
    where blocked_pair.blocker_id = any(v_all_member_ids)
      and blocked_pair.blocked_id = any(v_all_member_ids)
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'blocked_group_members';
  end if;

  insert into public.conversations (
    type,
    title,
    created_by
  )
  values (
    'group',
    v_title,
    v_creator_id
  )
  returning id into v_conversation_id;

  insert into public.conversation_members (
    conversation_id,
    user_id,
    role,
    last_read_at
  )
  values (
    v_conversation_id,
    v_creator_id,
    'owner',
    now()
  );

  insert into public.conversation_members (
    conversation_id,
    user_id,
    role,
    last_read_at
  )
  select
    v_conversation_id,
    selected_member_id,
    'member',
    now()
  from unnest(v_member_ids) as selected_member(selected_member_id);

  insert into public.messages (
    conversation_id,
    sender_id,
    message_type,
    body
  )
  values (
    v_conversation_id,
    v_creator_id,
    'system',
    '단체방이 만들어졌어요.'
  )
  returning * into v_message;

  update public.conversations
  set
    last_message_at = v_message.created_at,
    last_message_preview = v_message.body
  where id = v_conversation_id;

  return v_conversation_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[])
from public;
revoke all on function public.create_group_conversation(text, uuid[])
from anon;
grant execute on function public.create_group_conversation(text, uuid[])
to authenticated;

create or replace function public.send_message(
  target_conversation_id uuid,
  message_body text
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := (select auth.uid());
  v_body text := btrim(message_body);
  v_conversation_type text;
  v_message public.messages;
begin
  if v_sender_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if v_body is null or char_length(v_body) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'empty_message';
  end if;

  if char_length(v_body) > 1000 then
    raise exception using
      errcode = 'P0001',
      message = 'message_too_long';
  end if;

  select conversation.type
  into v_conversation_type
  from public.conversation_members as sender_membership
  inner join public.conversations as conversation
    on conversation.id = sender_membership.conversation_id
  where sender_membership.conversation_id = target_conversation_id
    and sender_membership.user_id = v_sender_id
    and sender_membership.left_at is null
    and conversation.archived_at is null;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'active_membership_required';
  end if;

  if v_conversation_type = 'direct' and exists (
    select 1
    from public.conversation_members as other_membership
    inner join public.user_blocks as blocked_pair
      on (
        blocked_pair.blocker_id = v_sender_id
        and blocked_pair.blocked_id = other_membership.user_id
      )
      or (
        blocked_pair.blocker_id = other_membership.user_id
        and blocked_pair.blocked_id = v_sender_id
      )
    where other_membership.conversation_id = target_conversation_id
      and other_membership.user_id <> v_sender_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'user_blocked';
  end if;

  if not exists (
    select 1
    from public.conversation_members as other_active_membership
    where other_active_membership.conversation_id =
      target_conversation_id
      and other_active_membership.user_id <> v_sender_id
      and other_active_membership.left_at is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'other_member_left';
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    message_type,
    body
  )
  values (
    target_conversation_id,
    v_sender_id,
    'text',
    v_body
  )
  returning * into v_message;

  update public.conversations
  set
    last_message_at = v_message.created_at,
    last_message_preview = left(
      pg_catalog.regexp_replace(v_body, '\s+', ' ', 'g'),
      80
    )
  where id = target_conversation_id;

  update public.conversation_members
  set hidden_at = null
  where conversation_id = target_conversation_id
    and left_at is null;

  update public.conversation_members
  set last_read_at = v_message.created_at
  where conversation_id = target_conversation_id
    and user_id = v_sender_id;

  return v_message;
end;
$$;

revoke all on function public.send_message(uuid, text) from public;
revoke all on function public.send_message(uuid, text) from anon;
grant execute on function public.send_message(uuid, text)
to authenticated;

create or replace function public.update_my_conversation_settings(
  target_conversation_id uuid,
  setting_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_conversation_type text;
  v_member_role text;
  v_public_nickname text;
  v_next_owner_id uuid;
  v_system_message public.messages;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if setting_action = 'read' then
    update public.conversation_members
    set last_read_at = now()
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;
  elsif setting_action = 'mute' then
    update public.conversation_members
    set is_muted = true
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;
  elsif setting_action = 'unmute' then
    update public.conversation_members
    set is_muted = false
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;
  elsif setting_action = 'hide' then
    update public.conversation_members
    set hidden_at = now()
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;
  elsif setting_action = 'unhide' then
    update public.conversation_members
    set hidden_at = null
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;
  elsif setting_action = 'leave' then
    select
      conversation.type,
      own_membership.role,
      own_profile.public_nickname
    into
      v_conversation_type,
      v_member_role,
      v_public_nickname
    from public.conversation_members as own_membership
    inner join public.conversations as conversation
      on conversation.id = own_membership.conversation_id
    left join public.profiles as own_profile
      on own_profile.id = own_membership.user_id
    where own_membership.conversation_id = target_conversation_id
      and own_membership.user_id = v_user_id
      and own_membership.left_at is null
    for update of own_membership;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'active_membership_required';
    end if;

    update public.conversation_members
    set
      left_at = now(),
      hidden_at = now()
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;

    if v_conversation_type = 'group' then
      if v_member_role = 'owner' then
        select remaining_membership.user_id
        into v_next_owner_id
        from public.conversation_members as remaining_membership
        where remaining_membership.conversation_id =
          target_conversation_id
          and remaining_membership.left_at is null
        order by
          case remaining_membership.role
            when 'admin' then 0
            else 1
          end,
          remaining_membership.joined_at,
          remaining_membership.user_id
        limit 1
        for update;

        if v_next_owner_id is not null then
          update public.conversation_members
          set role = 'owner'
          where conversation_id = target_conversation_id
            and user_id = v_next_owner_id;
        end if;
      end if;

      if exists (
        select 1
        from public.conversation_members as remaining_membership
        where remaining_membership.conversation_id =
          target_conversation_id
          and remaining_membership.left_at is null
      ) then
        insert into public.messages (
          conversation_id,
          sender_id,
          message_type,
          body
        )
        values (
          target_conversation_id,
          v_user_id,
          'system',
          coalesce(v_public_nickname, '한 멤버')
            || '님이 방을 나갔어요.'
        )
        returning * into v_system_message;

        update public.conversations
        set
          last_message_at = v_system_message.created_at,
          last_message_preview = v_system_message.body
        where id = target_conversation_id;

        update public.conversation_members
        set hidden_at = null
        where conversation_id = target_conversation_id
          and left_at is null;
      else
        update public.conversations
        set archived_at = now()
        where id = target_conversation_id;
      end if;
    end if;

    return;
  else
    raise exception using
      errcode = 'P0001',
      message = 'invalid_setting_action';
  end if;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'active_membership_required';
  end if;
end;
$$;

revoke all on function public.update_my_conversation_settings(uuid, text)
from public;
revoke all on function public.update_my_conversation_settings(uuid, text)
from anon;
grant execute on function public.update_my_conversation_settings(uuid, text)
to authenticated;

create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  conversation_type text,
  conversation_title text,
  member_count bigint,
  other_user_id uuid,
  other_public_nickname text,
  other_persona_title text,
  other_mood_keywords jsonb,
  created_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  is_muted boolean,
  unread_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    conversation.id as conversation_id,
    conversation.type as conversation_type,
    conversation.title as conversation_title,
    (
      select count(*)
      from public.conversation_members as active_member
      where active_member.conversation_id = conversation.id
        and active_member.left_at is null
    ) as member_count,
    case
      when conversation.type = 'direct'
      then other_membership.user_id
      else null
    end as other_user_id,
    case
      when conversation.type = 'direct'
      then other_profile.public_nickname
      else null
    end as other_public_nickname,
    case
      when conversation.type = 'direct'
      then other_persona.persona_title
      else null
    end as other_persona_title,
    case
      when conversation.type = 'direct'
      then other_persona.mood_keywords
      else '[]'::jsonb
    end as other_mood_keywords,
    conversation.created_at,
    conversation.last_message_at,
    conversation.last_message_preview,
    own_membership.is_muted,
    (
      select count(*)
      from public.messages as unread_message
      where unread_message.conversation_id = conversation.id
        and unread_message.sender_id <> (select auth.uid())
        and unread_message.deleted_at is null
        and unread_message.created_at >
          coalesce(
            own_membership.last_read_at,
            own_membership.joined_at
          )
    ) as unread_count
  from public.conversation_members as own_membership
  inner join public.conversations as conversation
    on conversation.id = own_membership.conversation_id
  left join lateral (
    select other_member.user_id
    from public.conversation_members as other_member
    where other_member.conversation_id = conversation.id
      and other_member.user_id <> own_membership.user_id
    order by other_member.joined_at
    limit 1
  ) as other_membership on true
  left join public.profiles as other_profile
    on other_profile.id = other_membership.user_id
  left join public.personas as other_persona
    on other_persona.user_id = other_membership.user_id
  where own_membership.user_id = (select auth.uid())
    and own_membership.left_at is null
    and own_membership.hidden_at is null
    and conversation.archived_at is null
  order by
    coalesce(
      conversation.last_message_at,
      conversation.created_at
    ) desc;
$$;

revoke all on function public.get_my_conversations() from public;
revoke all on function public.get_my_conversations() from anon;
grant execute on function public.get_my_conversations()
to authenticated;

create or replace function public.get_conversation_context(
  target_conversation_id uuid
)
returns table (
  conversation_id uuid,
  conversation_type text,
  conversation_title text,
  current_user_role text,
  members jsonb,
  other_user_id uuid,
  other_public_nickname text,
  other_persona_title text,
  is_muted boolean,
  is_hidden boolean,
  is_blocked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    conversation.id as conversation_id,
    conversation.type as conversation_type,
    conversation.title as conversation_title,
    own_membership.role as current_user_role,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'user_id', active_member.user_id,
            'public_nickname', member_profile.public_nickname,
            'persona_title', member_persona.persona_title,
            'role', active_member.role
          )
          order by
            case active_member.role
              when 'owner' then 0
              when 'admin' then 1
              else 2
            end,
            active_member.joined_at,
            active_member.user_id
        )
        from public.conversation_members as active_member
        left join public.profiles as member_profile
          on member_profile.id = active_member.user_id
        left join public.personas as member_persona
          on member_persona.user_id = active_member.user_id
        where active_member.conversation_id = conversation.id
          and active_member.left_at is null
      ),
      '[]'::jsonb
    ) as members,
    case
      when conversation.type = 'direct'
      then other_membership.user_id
      else null
    end as other_user_id,
    case
      when conversation.type = 'direct'
      then other_profile.public_nickname
      else null
    end as other_public_nickname,
    case
      when conversation.type = 'direct'
      then other_persona.persona_title
      else null
    end as other_persona_title,
    own_membership.is_muted,
    own_membership.hidden_at is not null as is_hidden,
    case
      when conversation.type = 'direct'
      then exists (
        select 1
        from public.user_blocks as blocked_pair
        where (
          blocked_pair.blocker_id = own_membership.user_id
          and blocked_pair.blocked_id = other_membership.user_id
        )
        or (
          blocked_pair.blocker_id = other_membership.user_id
          and blocked_pair.blocked_id = own_membership.user_id
        )
      )
      else false
    end as is_blocked
  from public.conversation_members as own_membership
  inner join public.conversations as conversation
    on conversation.id = own_membership.conversation_id
  left join lateral (
    select other_member.user_id
    from public.conversation_members as other_member
    where other_member.conversation_id = conversation.id
      and other_member.user_id <> own_membership.user_id
    order by other_member.joined_at
    limit 1
  ) as other_membership on true
  left join public.profiles as other_profile
    on other_profile.id = other_membership.user_id
  left join public.personas as other_persona
    on other_persona.user_id = other_membership.user_id
  where own_membership.user_id = (select auth.uid())
    and own_membership.conversation_id = target_conversation_id
    and own_membership.left_at is null
    and conversation.archived_at is null;
$$;

revoke all on function public.get_conversation_context(uuid)
from public;
revoke all on function public.get_conversation_context(uuid)
from anon;
grant execute on function public.get_conversation_context(uuid)
to authenticated;
