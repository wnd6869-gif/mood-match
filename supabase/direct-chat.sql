-- Run this file manually in the Supabase SQL Editor after:
-- profiles.sql, personas.sql, public-chat-profile.sql, and
-- conversation-requests.sql.
--
-- This file implements direct text chat only. It does not create group rooms,
-- file messages, push notifications, or message editing.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'direct',
  created_from_request_id uuid null unique
    references public.conversation_requests (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz null,
  last_message_preview text null,
  constraint conversations_type_valid
    check (type in ('direct', 'group')),
  constraint conversations_preview_valid
    check (
      last_message_preview is null
      or char_length(last_message_preview) <= 80
    )
);

create table if not exists public.conversation_members (
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz null,
  hidden_at timestamptz null,
  last_read_at timestamptz null,
  is_muted boolean not null default false,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  sender_id uuid not null
    references auth.users (id) on delete cascade,
  message_type text not null default 'text',
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint messages_type_valid
    check (message_type in ('text', 'system')),
  constraint messages_body_valid
    check (
      body = btrim(body)
      and char_length(body) between 1 and 1000
    )
);

create table if not exists public.user_blocks (
  blocker_id uuid not null
    references auth.users (id) on delete cascade,
  blocked_id uuid not null
    references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_different_users
    check (blocker_id <> blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null
    references auth.users (id) on delete cascade,
  reported_user_id uuid not null
    references auth.users (id) on delete cascade,
  conversation_id uuid null
    references public.conversations (id) on delete set null,
  reason text not null,
  details text null,
  created_at timestamptz not null default now(),
  status text not null default 'pending',
  constraint user_reports_different_users
    check (reporter_id <> reported_user_id),
  constraint user_reports_reason_valid
    check (
      reason in (
        '불쾌한 언행',
        '성적 메시지',
        '사칭',
        '광고 또는 도배',
        '개인정보 요구',
        '기타'
      )
    ),
  constraint user_reports_details_valid
    check (
      details is null
      or (
        details = btrim(details)
        and char_length(details) between 1 and 500
      )
    ),
  constraint user_reports_status_valid
    check (status in ('pending', 'reviewing', 'resolved', 'dismissed'))
);

create index if not exists conversation_members_user_idx
on public.conversation_members (user_id, conversation_id);

create index if not exists messages_conversation_created_idx
on public.messages (conversation_id, created_at desc);

create index if not exists conversations_last_message_idx
on public.conversations (last_message_at desc nulls last);

create index if not exists conversation_requests_status_participants_idx
on public.conversation_requests (status, receiver_id, sender_id);

create index if not exists user_blocks_blocked_idx
on public.user_blocks (blocked_id, blocker_id);

create index if not exists user_reports_reporter_created_idx
on public.user_reports (reporter_id, created_at desc);

create or replace function public.is_conversation_member(
  target_conversation_id uuid,
  require_active boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members as membership
    where membership.conversation_id = target_conversation_id
      and membership.user_id = (select auth.uid())
      and (
        not require_active
        or membership.left_at is null
      )
  );
$$;

revoke all on function public.is_conversation_member(uuid, boolean)
from public;
revoke all on function public.is_conversation_member(uuid, boolean)
from anon;
grant execute on function public.is_conversation_member(uuid, boolean)
to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;

drop policy if exists "Members can view their conversations"
on public.conversations;
create policy "Members can view their conversations"
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id, false));

drop policy if exists "Members can view conversation memberships"
on public.conversation_members;
create policy "Members can view conversation memberships"
on public.conversation_members
for select
to authenticated
using (public.is_conversation_member(conversation_id, false));

drop policy if exists "Members can update their own chat preferences"
on public.conversation_members;
create policy "Members can update their own chat preferences"
on public.conversation_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and left_at is null
)
with check (
  user_id = (select auth.uid())
);

drop policy if exists "Active members can view messages"
on public.messages;
create policy "Active members can view messages"
on public.messages
for select
to authenticated
using (
  public.is_conversation_member(conversation_id, true)
);

drop policy if exists "Users can view blocks they created"
on public.user_blocks;
create policy "Users can view blocks they created"
on public.user_blocks
for select
to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists "Users can create their own blocks"
on public.user_blocks;
create policy "Users can create their own blocks"
on public.user_blocks
for insert
to authenticated
with check (
  blocker_id = (select auth.uid())
  and blocker_id <> blocked_id
);

drop policy if exists "Users can remove their own blocks"
on public.user_blocks;
create policy "Users can remove their own blocks"
on public.user_blocks
for delete
to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists "Users can view reports they submitted"
on public.user_reports;
create policy "Users can view reports they submitted"
on public.user_reports
for select
to authenticated
using (reporter_id = (select auth.uid()));

drop policy if exists "Users can submit their own reports"
on public.user_reports;
create policy "Users can submit their own reports"
on public.user_reports
for insert
to authenticated
with check (
  reporter_id = (select auth.uid())
  and reporter_id <> reported_user_id
);

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.conversation_members from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.user_blocks from anon, authenticated;
revoke all on table public.user_reports from anon, authenticated;

grant select on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant update (hidden_at, last_read_at, is_muted)
on table public.conversation_members
to authenticated;
grant select on table public.messages to authenticated;
grant select, insert, delete on table public.user_blocks
to authenticated;
grant select, insert on table public.user_reports to authenticated;

-- Conversation requests must go through send_conversation_request so block
-- checks cannot be bypassed with a direct insert.
revoke insert on table public.conversation_requests from authenticated;

create or replace function public.prevent_blocked_conversation_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.user_blocks as blocked_pair
    where (
      blocked_pair.blocker_id = new.sender_id
      and blocked_pair.blocked_id = new.receiver_id
    )
    or (
      blocked_pair.blocker_id = new.receiver_id
      and blocked_pair.blocked_id = new.sender_id
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'user_blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_blocked_conversation_request
on public.conversation_requests;
create trigger prevent_blocked_conversation_request
before insert on public.conversation_requests
for each row
execute function public.prevent_blocked_conversation_request();

revoke all on function public.prevent_blocked_conversation_request()
from public;
revoke all on function public.prevent_blocked_conversation_request()
from anon;

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
    conversation_request.receiver_id
  into
    v_sender_id,
    v_receiver_id
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

  return v_conversation_id;
end;
$$;

revoke all on function public.create_direct_conversation_from_request(uuid)
from public;
revoke all on function public.create_direct_conversation_from_request(uuid)
from anon;
grant execute on function public.create_direct_conversation_from_request(uuid)
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

  if not exists (
    select 1
    from public.conversation_members as sender_membership
    inner join public.conversations as direct_conversation
      on direct_conversation.id = sender_membership.conversation_id
    where sender_membership.conversation_id = target_conversation_id
      and sender_membership.user_id = v_sender_id
      and sender_membership.left_at is null
      and direct_conversation.type = 'direct'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'active_membership_required';
  end if;

  if exists (
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
      regexp_replace(v_body, '\s+', ' ', 'g'),
      80
    )
  where id = target_conversation_id;

  update public.conversation_members
  set
    hidden_at = null,
    last_read_at = v_message.created_at
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
    update public.conversation_members
    set
      left_at = now(),
      hidden_at = now()
    where conversation_id = target_conversation_id
      and user_id = v_user_id
      and left_at is null;
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

create or replace function public.block_chat_user(
  target_user_id uuid,
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blocker_id uuid := (select auth.uid());
begin
  if v_blocker_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if target_user_id is null or target_user_id = v_blocker_id then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_block_target';
  end if;

  if not exists (
    select 1
    from public.conversation_members as own_membership
    inner join public.conversation_members as target_membership
      on target_membership.conversation_id =
        own_membership.conversation_id
    where own_membership.conversation_id = target_conversation_id
      and own_membership.user_id = v_blocker_id
      and own_membership.left_at is null
      and target_membership.user_id = target_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_block_target';
  end if;

  insert into public.user_blocks (
    blocker_id,
    blocked_id
  )
  values (
    v_blocker_id,
    target_user_id
  )
  on conflict (blocker_id, blocked_id) do nothing;

  update public.conversation_members
  set hidden_at = now()
  where conversation_id = target_conversation_id
    and user_id = v_blocker_id;
end;
$$;

revoke all on function public.block_chat_user(uuid, uuid) from public;
revoke all on function public.block_chat_user(uuid, uuid) from anon;
grant execute on function public.block_chat_user(uuid, uuid)
to authenticated;

create or replace function public.report_chat_user(
  target_user_id uuid,
  target_conversation_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reporter_id uuid := (select auth.uid());
  v_details text := nullif(btrim(report_details), '');
  v_report_id uuid;
begin
  if v_reporter_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if target_user_id is null or target_user_id = v_reporter_id then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_target';
  end if;

  if report_reason not in (
    '불쾌한 언행',
    '성적 메시지',
    '사칭',
    '광고 또는 도배',
    '개인정보 요구',
    '기타'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_reason';
  end if;

  if v_details is not null and char_length(v_details) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'report_details_too_long';
  end if;

  if not exists (
    select 1
    from public.conversation_members as own_membership
    inner join public.conversation_members as target_membership
      on target_membership.conversation_id =
        own_membership.conversation_id
    where own_membership.conversation_id = target_conversation_id
      and own_membership.user_id = v_reporter_id
      and target_membership.user_id = target_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_target';
  end if;

  insert into public.user_reports (
    reporter_id,
    reported_user_id,
    conversation_id,
    reason,
    details
  )
  values (
    v_reporter_id,
    target_user_id,
    target_conversation_id,
    report_reason,
    v_details
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

revoke all on function public.report_chat_user(
  uuid,
  uuid,
  text,
  text
) from public;
revoke all on function public.report_chat_user(
  uuid,
  uuid,
  text,
  text
) from anon;
grant execute on function public.report_chat_user(
  uuid,
  uuid,
  text,
  text
) to authenticated;

create or replace function public.get_my_direct_conversations()
returns table (
  conversation_id uuid,
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
    direct_conversation.id as conversation_id,
    other_membership.user_id as other_user_id,
    other_profile.public_nickname as other_public_nickname,
    other_persona.persona_title as other_persona_title,
    other_persona.mood_keywords as other_mood_keywords,
    direct_conversation.created_at,
    direct_conversation.last_message_at,
    direct_conversation.last_message_preview,
    own_membership.is_muted,
    (
      select count(*)
      from public.messages as unread_message
      where unread_message.conversation_id = direct_conversation.id
        and unread_message.sender_id <> (select auth.uid())
        and unread_message.deleted_at is null
        and unread_message.created_at >
          coalesce(
            own_membership.last_read_at,
            own_membership.joined_at
          )
    ) as unread_count
  from public.conversation_members as own_membership
  inner join public.conversations as direct_conversation
    on direct_conversation.id = own_membership.conversation_id
  inner join public.conversation_members as other_membership
    on other_membership.conversation_id = direct_conversation.id
    and other_membership.user_id <> own_membership.user_id
  left join public.profiles as other_profile
    on other_profile.id = other_membership.user_id
  left join public.personas as other_persona
    on other_persona.user_id = other_membership.user_id
  where own_membership.user_id = (select auth.uid())
    and own_membership.left_at is null
    and own_membership.hidden_at is null
    and direct_conversation.type = 'direct'
  order by
    coalesce(
      direct_conversation.last_message_at,
      direct_conversation.created_at
    ) desc;
$$;

revoke all on function public.get_my_direct_conversations() from public;
revoke all on function public.get_my_direct_conversations() from anon;
grant execute on function public.get_my_direct_conversations()
to authenticated;

create or replace function public.get_direct_conversation_context(
  target_conversation_id uuid
)
returns table (
  conversation_id uuid,
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
    direct_conversation.id as conversation_id,
    other_membership.user_id as other_user_id,
    other_profile.public_nickname as other_public_nickname,
    other_persona.persona_title as other_persona_title,
    own_membership.is_muted,
    own_membership.hidden_at is not null as is_hidden,
    exists (
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
    ) as is_blocked
  from public.conversation_members as own_membership
  inner join public.conversations as direct_conversation
    on direct_conversation.id = own_membership.conversation_id
  inner join public.conversation_members as other_membership
    on other_membership.conversation_id = direct_conversation.id
    and other_membership.user_id <> own_membership.user_id
  left join public.profiles as other_profile
    on other_profile.id = other_membership.user_id
  left join public.personas as other_persona
    on other_persona.user_id = other_membership.user_id
  where own_membership.user_id = (select auth.uid())
    and own_membership.conversation_id = target_conversation_id
    and own_membership.left_at is null
    and direct_conversation.type = 'direct';
$$;

revoke all on function public.get_direct_conversation_context(uuid)
from public;
revoke all on function public.get_direct_conversation_context(uuid)
from anon;
grant execute on function public.get_direct_conversation_context(uuid)
to authenticated;

create or replace function public.discover_available_chat_profiles(
  p_target_user_id uuid default null,
  p_goal text default null,
  p_mood text default null,
  p_topic text default null,
  p_one_to_one_only boolean default false,
  p_time_slot text default null
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
  request_direction text
)
language sql
stable
security definer
set search_path = ''
as $$
  select discoverable_profile.*
  from public.discover_public_chat_profiles(
    p_target_user_id,
    p_goal,
    p_mood,
    p_topic,
    p_one_to_one_only,
    p_time_slot
  ) as discoverable_profile
  where not exists (
    select 1
    from public.user_blocks as blocked_pair
    where (
      blocked_pair.blocker_id = (select auth.uid())
      and blocked_pair.blocked_id = discoverable_profile.user_id
    )
    or (
      blocked_pair.blocker_id = discoverable_profile.user_id
      and blocked_pair.blocked_id = (select auth.uid())
    )
  );
$$;

revoke all on function public.discover_available_chat_profiles(
  uuid,
  text,
  text,
  text,
  boolean,
  text
) from public;
revoke all on function public.discover_available_chat_profiles(
  uuid,
  text,
  text,
  text,
  boolean,
  text
) from anon;
grant execute on function public.discover_available_chat_profiles(
  uuid,
  text,
  text,
  text,
  boolean,
  text
) to authenticated;

-- Postgres Changes is appropriate for this MVP. For high concurrent
-- subscriber counts, migrate message fan-out to private Broadcast channels.
do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
