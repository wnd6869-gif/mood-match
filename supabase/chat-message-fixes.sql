-- Run this migration after conversation-requests.sql, direct-chat.sql, and
-- group-chat.sql.
--
-- The optional intro message is copied into the new direct conversation as
-- its first real message. Previously it stayed only on the request card.

create or replace function public.create_direct_conversation_from_request(
  request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_sender_id uuid;
  v_receiver_id uuid;
  v_conversation_id uuid;
  v_intro_message text;
  v_first_message public.messages;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(request_id::text, 0)
  );

  select
    conversation_request.sender_id,
    conversation_request.receiver_id,
    conversation_request.message
  into
    v_sender_id,
    v_receiver_id,
    v_intro_message
  from public.conversation_requests as conversation_request
  where conversation_request.id = request_id
    and conversation_request.status = 'accepted'
    and v_user_id in (
      conversation_request.sender_id,
      conversation_request.receiver_id
    );

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'accepted_request_required';
  end if;

  if v_sender_id = v_receiver_id then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_request_participants';
  end if;

  if exists (
    select 1
    from public.user_blocks as blocked_pair
    where (
      blocked_pair.blocker_id = v_sender_id
      and blocked_pair.blocked_id = v_receiver_id
    )
    or (
      blocked_pair.blocker_id = v_receiver_id
      and blocked_pair.blocked_id = v_sender_id
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'user_blocked';
  end if;

  select existing_conversation.id
  into v_conversation_id
  from public.conversations as existing_conversation
  where existing_conversation.created_from_request_id = request_id;

  if found then
    if not exists (
      select 1
      from public.conversation_members as existing_membership
      where existing_membership.conversation_id = v_conversation_id
        and existing_membership.user_id = v_user_id
        and existing_membership.left_at is null
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'active_membership_required';
    end if;

    return v_conversation_id;
  end if;

  insert into public.conversations (
    type,
    created_from_request_id
  )
  values (
    'direct',
    request_id
  )
  returning id into v_conversation_id;

  insert into public.conversation_members (
    conversation_id,
    user_id,
    last_read_at
  )
  values
    (v_conversation_id, v_sender_id, now()),
    (v_conversation_id, v_receiver_id, now());

  if v_intro_message is not null then
    insert into public.messages (
      conversation_id,
      sender_id,
      message_type,
      body
    )
    values (
      v_conversation_id,
      v_sender_id,
      'text',
      v_intro_message
    )
    returning * into v_first_message;

    update public.conversations
    set
      last_message_at = v_first_message.created_at,
      last_message_preview = left(
        pg_catalog.regexp_replace(v_intro_message, '\s+', ' ', 'g'),
        80
      )
    where id = v_conversation_id;

    update public.conversation_members
    set last_read_at = v_first_message.created_at
    where conversation_id = v_conversation_id
      and user_id = v_sender_id;
  end if;

  return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation_from_request(uuid)
from public, anon;
grant execute on function public.create_direct_conversation_from_request(uuid)
to authenticated;
