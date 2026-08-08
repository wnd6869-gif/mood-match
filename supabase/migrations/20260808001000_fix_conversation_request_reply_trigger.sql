-- A conversation request can be accepted by the receiver, while the request's
-- original greeting is still authored by the sender. The generic message
-- safety trigger previously rejected that one server-side insert because the
-- receiver is the authenticated caller. Permit only this narrowly-scoped
-- request bootstrap path; all normal messages must continue to match auth.uid.

create or replace function public.prevent_unsafe_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_authenticated_user_id uuid := (select auth.uid());
begin
  if new.sender_id <> v_authenticated_user_id then
    if not exists (
      select 1
      from public.conversations as conversation
      join public.conversation_requests as request
        on request.id = conversation.created_from_request_id
      where conversation.id = new.conversation_id
        and request.status = 'accepted'
        and request.sender_id = new.sender_id
        and request.receiver_id = v_authenticated_user_id
        and (
          (
            new.message_type = 'text'
            and new.body = request.message
            and not exists (
              select 1
              from public.messages as existing_message
              where existing_message.conversation_id = new.conversation_id
            )
          )
          or new.message_type = 'system'
        )
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_message_sender';
    end if;
  end if;

  if not public.is_user_operational(new.sender_id) then
    raise exception using
      errcode = 'P0001',
      message = 'user_unavailable';
  end if;

  if exists (
    select 1
    from public.conversation_members as other_membership
    where other_membership.conversation_id = new.conversation_id
      and other_membership.user_id <> new.sender_id
      and (
        not public.is_user_operational(other_membership.user_id)
        or exists (
          select 1
          from public.user_blocks as blocked_pair
          where (
            blocked_pair.blocker_id = new.sender_id
            and blocked_pair.blocked_id = other_membership.user_id
          )
          or (
            blocked_pair.blocker_id = other_membership.user_id
            and blocked_pair.blocked_id = new.sender_id
          )
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'user_blocked';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unsafe_message() from public, anon, authenticated;
