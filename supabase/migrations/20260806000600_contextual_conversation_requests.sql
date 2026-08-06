-- Context saved with a conversation request. Apply after 00400 daily cards,
-- 00500 conversation profile v2, conversation-requests.sql and direct-chat.sql.
-- The client chooses a reason type, but this function derives every visible
-- value again on the server so a request cannot forge another user's daily card.

alter table public.conversation_requests
  add column if not exists start_reason jsonb null,
  add column if not exists daily_card_snapshot jsonb null,
  add column if not exists expires_at timestamptz null;

update public.conversation_requests
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.conversation_requests
  alter column expires_at set default (now() + interval '7 days');

create index if not exists conversation_requests_pending_expires_idx
on public.conversation_requests (expires_at)
where status = 'pending';

create or replace function public.send_contextual_conversation_request(
  target_user_id uuid,
  intro_message text,
  reason_kind text,
  reason_value text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := (select auth.uid());
  v_request_id uuid;
  v_reason jsonb;
  v_daily_card record;
  v_target_topics text[];
  v_sender_topics text[];
  v_target_times text[];
  v_sender_times text[];
  v_persona_title text;
  v_daily_snapshot jsonb := null;
begin
  if v_sender_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if nullif(btrim(intro_message), '') is null then
    raise exception using errcode = 'P0001', message = 'message_required';
  end if;
  if reason_kind not in ('common_interest', 'shared_time', 'daily_question', 'daily_topic', 'character') then
    raise exception using errcode = 'P0001', message = 'invalid_request_reason';
  end if;

  update public.conversation_requests
  set status = 'cancelled', responded_at = now()
  where status = 'pending'
    and expires_at <= now()
    and ((sender_id = v_sender_id and receiver_id = target_user_id)
      or (sender_id = target_user_id and receiver_id = v_sender_id));

  select conversation_topics, available_time_slots
  into v_sender_topics, v_sender_times
  from public.profiles where id = v_sender_id;
  select conversation_topics, available_time_slots
  into v_target_topics, v_target_times
  from public.profiles where id = target_user_id;

  select question, topic, custom_topic, card_date
  into v_daily_card
  from public.daily_conversation_cards
  where user_id = target_user_id
    and card_date = public.kst_today()
    and skipped = false
  limit 1;
  if found then
    v_daily_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'question', v_daily_card.question,
      'topic', v_daily_card.topic,
      'customTopic', v_daily_card.custom_topic,
      'cardDate', v_daily_card.card_date
    ));
  end if;

  if reason_kind = 'common_interest' then
    if reason_value is null or not (reason_value = any(coalesce(v_sender_topics, '{}')) and reason_value = any(coalesce(v_target_topics, '{}'))) then
      raise exception using errcode = 'P0001', message = 'invalid_request_reason';
    end if;
    v_reason := jsonb_build_object('kind', reason_kind, 'value', reason_value);
  elsif reason_kind = 'shared_time' then
    if reason_value is null or not (reason_value = any(coalesce(v_sender_times, '{}')) and reason_value = any(coalesce(v_target_times, '{}'))) then
      raise exception using errcode = 'P0001', message = 'invalid_request_reason';
    end if;
    v_reason := jsonb_build_object('kind', reason_kind, 'value', reason_value);
  elsif reason_kind in ('daily_question', 'daily_topic') then
    if v_daily_snapshot is null then
      raise exception using errcode = 'P0001', message = 'daily_card_unavailable';
    end if;
    if reason_kind = 'daily_question' and nullif(btrim(v_daily_card.question), '') is null then
      raise exception using errcode = 'P0001', message = 'daily_card_unavailable';
    end if;
    if reason_kind = 'daily_topic' and v_daily_card.topic is null then
      raise exception using errcode = 'P0001', message = 'daily_card_unavailable';
    end if;
    v_reason := jsonb_strip_nulls(jsonb_build_object(
      'kind', reason_kind,
      'question', v_daily_card.question,
      'topic', v_daily_card.topic,
      'customTopic', v_daily_card.custom_topic
    ));
  else
    select persona_title into v_persona_title from public.personas where user_id = target_user_id;
    if v_persona_title is null then
      raise exception using errcode = 'P0001', message = 'target_unavailable';
    end if;
    v_reason := jsonb_build_object('kind', reason_kind, 'personaTitle', v_persona_title);
  end if;

  v_request_id := public.send_conversation_request(target_user_id, intro_message);
  update public.conversation_requests
  set
    start_reason = v_reason,
    daily_card_snapshot = v_daily_snapshot
  where id = v_request_id;
  return v_request_id;
end;
$$;

revoke all on function public.send_contextual_conversation_request(uuid, text, text, text) from public, anon;
grant execute on function public.send_contextual_conversation_request(uuid, text, text, text) to authenticated;

create or replace function public.respond_to_conversation_request(
  request_id uuid,
  response text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := (select auth.uid());
begin
  if v_receiver_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if response not in ('accepted', 'declined') then
    raise exception using errcode = 'P0001', message = 'invalid_response';
  end if;
  if exists (
    select 1 from public.conversation_requests
    where id = request_id
      and receiver_id = v_receiver_id
      and status = 'pending'
      and expires_at <= now()
  ) then
    raise exception using errcode = 'P0001', message = 'request_expired';
  end if;

  update public.conversation_requests
  set status = response, responded_at = now()
  where id = request_id
    and receiver_id = v_receiver_id
    and status = 'pending'
    and expires_at > now();
  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_actionable';
  end if;
end;
$$;

revoke all on function public.respond_to_conversation_request(uuid, text) from public, anon;
grant execute on function public.respond_to_conversation_request(uuid, text) to authenticated;

create or replace function public.accept_conversation_request_with_reply(
  request_id uuid,
  reply_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receiver_id uuid := (select auth.uid());
  v_conversation_id uuid;
  v_sender_id uuid;
  v_reason jsonb;
  v_intro_created_at timestamptz;
  v_reason_text text;
begin
  if v_receiver_id is null then
    raise exception using errcode = 'P0001', message = 'authentication_required';
  end if;
  if nullif(btrim(reply_message), '') is null then
    raise exception using errcode = 'P0001', message = 'reply_required';
  end if;
  if char_length(btrim(reply_message)) > 120 then
    raise exception using errcode = 'P0001', message = 'message_too_long';
  end if;

  if not exists (
    select 1 from public.conversation_requests
    where id = request_id
      and receiver_id = v_receiver_id
      and status = 'pending'
      and expires_at > now()
  ) then
    raise exception using errcode = 'P0001', message = 'request_expired';
  end if;

  select sender_id, start_reason
  into v_sender_id, v_reason
  from public.conversation_requests
  where id = request_id;

  perform public.respond_to_conversation_request(request_id, 'accepted');
  v_conversation_id := public.create_direct_conversation_from_request(request_id);

  if v_reason is not null then
    v_reason_text := case v_reason->>'kind'
      when 'common_interest' then '공통 관심사: ' || coalesce(v_reason->>'value', '')
      when 'shared_time' then '같은 대화 시간대: ' || coalesce(v_reason->>'value', '')
      when 'daily_question' then '오늘의 질문에 답하며 시작했어요'
      when 'daily_topic' then '오늘의 소재로 대화를 시작했어요'
      when 'character' then coalesce(v_reason->>'personaTitle', '캐릭터') || ' 이야기로 시작했어요'
      else '대화를 시작한 이유가 있어요'
    end;
    select min(created_at) into v_intro_created_at
    from public.messages
    where conversation_id = v_conversation_id;
    insert into public.messages (conversation_id, sender_id, message_type, body, created_at)
    values (
      v_conversation_id,
      v_sender_id,
      'system',
      '대화를 시작한 이유: ' || v_reason_text,
      coalesce(v_intro_created_at, now()) - interval '1 microsecond'
    );
  end if;
  perform public.send_message(v_conversation_id, btrim(reply_message));
  return v_conversation_id;
end;
$$;

revoke all on function public.accept_conversation_request_with_reply(uuid, text) from public, anon;
grant execute on function public.accept_conversation_request_with_reply(uuid, text) to authenticated;

drop function if exists public.get_my_conversation_requests();
create function public.get_my_conversation_requests()
returns table (
  request_id uuid,
  direction text,
  other_user_id uuid,
  other_public_nickname text,
  other_persona_title text,
  message text,
  start_reason jsonb,
  daily_card_snapshot jsonb,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  responded_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select
    request.id,
    case when request.sender_id = (select auth.uid()) then 'sent' else 'received' end,
    case when request.sender_id = (select auth.uid()) then request.receiver_id else request.sender_id end,
    profile.public_nickname,
    persona.persona_title,
    request.message,
    request.start_reason,
    request.daily_card_snapshot,
    case when request.status = 'pending' and request.expires_at <= now() then 'cancelled' else request.status end,
    request.expires_at,
    request.created_at,
    request.responded_at
  from public.conversation_requests request
  left join public.profiles profile on profile.id = case when request.sender_id = (select auth.uid()) then request.receiver_id else request.sender_id end
  left join public.personas persona on persona.user_id = profile.id
  where (select auth.uid()) is not null
    and ((select auth.uid()) in (request.sender_id, request.receiver_id))
  order by request.created_at desc;
$$;

revoke all on function public.get_my_conversation_requests() from public, anon;
grant execute on function public.get_my_conversation_requests() to authenticated;
