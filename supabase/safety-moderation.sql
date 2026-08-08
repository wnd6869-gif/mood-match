-- Run this migration manually in the Supabase SQL Editor after:
-- profiles.sql, personas.sql, public-chat-profile.sql,
-- conversation-requests.sql, and direct-chat.sql.
--
-- This migration preserves existing conversations, messages, blocks, and
-- reports. It does not delete moderation evidence.

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_different_users
    check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_idx
on public.user_blocks (blocked_id, blocker_id);

create index if not exists user_blocks_blocker_idx
on public.user_blocks (blocker_id, created_at desc);

alter table public.user_reports
  add column if not exists message_id uuid null
    references public.messages (id) on delete set null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists reviewed_by uuid null
    references auth.users (id) on delete set null,
  add column if not exists admin_note text null;

alter table public.user_reports
  drop constraint if exists user_reports_reason_valid;

update public.user_reports
set reason = case reason
  when '불쾌한 언행' then 'abusive_language'
  when '성적 메시지' then 'sexual_content'
  when '사칭' then 'impersonation'
  when '광고 또는 도배' then 'spam'
  when '개인정보 요구' then 'personal_info_request'
  when '괴롭힘' then 'harassment'
  when '미성년자 의심' then 'underage_suspicion'
  when '기타' then 'other'
  else reason
end;

alter table public.user_reports
  add constraint user_reports_reason_valid
  check (
    reason in (
      'abusive_language',
      'sexual_content',
      'impersonation',
      'spam',
      'personal_info_request',
      'harassment',
      'underage_suspicion',
      'other'
    )
  );

alter table public.user_reports
  drop constraint if exists user_reports_details_valid;

alter table public.user_reports
  add constraint user_reports_details_valid
  check (
    details is null
    or (
      details = btrim(details)
      and char_length(details) between 1 and 500
    )
  );

alter table public.user_reports
  drop constraint if exists user_reports_status_valid;

alter table public.user_reports
  add constraint user_reports_status_valid
  check (status in ('pending', 'reviewing', 'resolved', 'dismissed'));

create index if not exists user_reports_pending_pair_idx
on public.user_reports (reporter_id, reported_user_id, created_at desc)
where status in ('pending', 'reviewing');

create index if not exists user_reports_conversation_idx
on public.user_reports (conversation_id, created_at desc)
where conversation_id is not null;

create index if not exists user_reports_message_idx
on public.user_reports (message_id)
where message_id is not null;

create table if not exists public.user_moderation_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'active',
  reason text null,
  suspended_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_moderation_status_valid
    check (status in ('active', 'restricted', 'suspended', 'banned')),
  constraint user_moderation_suspension_valid
    check (
      (status = 'suspended' and suspended_until is not null)
      or (status <> 'suspended')
    )
);

create or replace function public.set_moderation_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_moderation_updated_at
on public.user_moderation_status;
create trigger set_moderation_updated_at
before update on public.user_moderation_status
for each row
execute function public.set_moderation_updated_at();

revoke all on function public.set_moderation_updated_at()
from public, anon, authenticated;

alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
alter table public.user_moderation_status enable row level security;

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

revoke all on table public.user_blocks from anon, authenticated;
grant select, insert, delete on table public.user_blocks to authenticated;

revoke all on table public.user_reports from anon, authenticated;
grant select (id, reason, status, created_at)
on table public.user_reports to authenticated;

-- No policies and no grants are intentionally provided. Normal users cannot
-- inspect or change another user's moderation status.
revoke all on table public.user_moderation_status from anon, authenticated;

-- Keep request creation behind send_conversation_request so the bilateral
-- block and moderation trigger cannot be bypassed by a direct insert.
revoke insert on table public.conversation_requests from authenticated;

create or replace function public.is_user_operational(
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.user_moderation_status as moderation
    where moderation.user_id = target_user_id
      and (
        moderation.status in ('restricted', 'banned')
        or (
          moderation.status = 'suspended'
          and moderation.suspended_until > now()
        )
      )
  );
$$;

revoke all on function public.is_user_operational(uuid) from public;
revoke all on function public.is_user_operational(uuid) from anon;
revoke all on function public.is_user_operational(uuid)
from authenticated;

create or replace function public.block_user(
  target_user_id uuid
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
    from auth.users as target_user
    where target_user.id = target_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_block_target';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_blocker_id, target_user_id)
  on conflict (blocker_id, blocked_id) do nothing;

  update public.conversation_members as own_membership
  set hidden_at = coalesce(own_membership.hidden_at, now())
  where own_membership.user_id in (v_blocker_id, target_user_id)
    and exists (
      select 1
      from public.conversations as direct_conversation
      inner join public.conversation_members as blocker_membership
        on blocker_membership.conversation_id = direct_conversation.id
        and blocker_membership.user_id = v_blocker_id
      inner join public.conversation_members as target_membership
        on target_membership.conversation_id = direct_conversation.id
        and target_membership.user_id = target_user_id
      where direct_conversation.id = own_membership.conversation_id
        and direct_conversation.type = 'direct'
    );
end;
$$;

revoke all on function public.block_user(uuid) from public;
revoke all on function public.block_user(uuid) from anon;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(
  target_user_id uuid
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

  delete from public.user_blocks
  where blocker_id = v_blocker_id
    and blocked_id = target_user_id;

  -- Intentionally do not clear conversation_members.hidden_at. Unblocking
  -- never reactivates an old conversation automatically.
end;
$$;

revoke all on function public.unblock_user(uuid) from public;
revoke all on function public.unblock_user(uuid) from anon;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.report_user(
  target_user_id uuid,
  report_reason text,
  report_details text default null,
  target_conversation_id uuid default null,
  target_message_id uuid default null
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
    'abusive_language',
    'sexual_content',
    'impersonation',
    'spam',
    'personal_info_request',
    'harassment',
    'underage_suspicion',
    'other'
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
    select 1 from auth.users as target_user
    where target_user.id = target_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_target';
  end if;

  if target_message_id is not null
    and target_conversation_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'conversation_required_for_message';
  end if;

  if target_conversation_id is not null then
    if not exists (
      select 1
      from public.conversation_members as reporter_membership
      where reporter_membership.conversation_id =
        target_conversation_id
        and reporter_membership.user_id = v_reporter_id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_report_context';
    end if;

    if not exists (
      select 1
      from public.conversation_members as target_membership
      where target_membership.conversation_id =
        target_conversation_id
        and target_membership.user_id = target_user_id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'invalid_report_target';
    end if;
  end if;

  if target_message_id is not null and not exists (
    select 1
    from public.messages as reported_message
    where reported_message.id = target_message_id
      and reported_message.conversation_id =
        target_conversation_id
      and reported_message.sender_id = target_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_message';
  end if;

  select existing_report.id
  into v_report_id
  from public.user_reports as existing_report
  where existing_report.reporter_id = v_reporter_id
    and existing_report.reported_user_id = target_user_id
    and existing_report.status in ('pending', 'reviewing')
    and existing_report.created_at >= now() - interval '24 hours'
  order by existing_report.created_at desc
  limit 1;

  if found then
    return v_report_id;
  end if;

  insert into public.user_reports (
    reporter_id,
    reported_user_id,
    conversation_id,
    message_id,
    reason,
    details
  )
  values (
    v_reporter_id,
    target_user_id,
    target_conversation_id,
    target_message_id,
    report_reason,
    v_details
  )
  returning id into v_report_id;

  return v_report_id;
end;
$$;

revoke all on function public.report_user(
  uuid, text, text, uuid, uuid
) from public;
revoke all on function public.report_user(
  uuid, text, text, uuid, uuid
) from anon;
grant execute on function public.report_user(
  uuid, text, text, uuid, uuid
) to authenticated;

-- Compatibility wrappers for clients deployed with direct-chat.sql.
create or replace function public.block_chat_user(
  target_user_id uuid,
  target_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_conversation_member(target_conversation_id, false)
    or not exists (
      select 1
      from public.conversation_members as target_membership
      where target_membership.conversation_id = target_conversation_id
        and target_membership.user_id = target_user_id
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_block_target';
  end if;

  perform public.block_user(target_user_id);
end;
$$;

create or replace function public.report_chat_user(
  target_user_id uuid,
  target_conversation_id uuid,
  report_reason text,
  report_details text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.report_user(
    target_user_id,
    report_reason,
    report_details,
    target_conversation_id,
    null::uuid
  );
$$;

revoke all on function public.block_chat_user(uuid, uuid)
from public, anon;
grant execute on function public.block_chat_user(uuid, uuid)
to authenticated;

revoke all on function public.report_chat_user(uuid, uuid, text, text)
from public, anon;
grant execute on function public.report_chat_user(uuid, uuid, text, text)
to authenticated;

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

  if not public.is_user_operational(new.sender_id)
    or not public.is_user_operational(new.receiver_id) then
    raise exception using
      errcode = 'P0001',
      message = 'user_unavailable';
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

create or replace function public.prevent_unsafe_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_user_operational(new.user_id) then
    raise exception using
      errcode = 'P0001',
      message = 'user_unavailable';
  end if;

  if exists (
    select 1
    from public.conversations as direct_conversation
    inner join public.conversation_members as existing_membership
      on existing_membership.conversation_id = direct_conversation.id
    inner join public.user_blocks as blocked_pair
      on (
        blocked_pair.blocker_id = new.user_id
        and blocked_pair.blocked_id = existing_membership.user_id
      )
      or (
        blocked_pair.blocker_id = existing_membership.user_id
        and blocked_pair.blocked_id = new.user_id
      )
    where direct_conversation.id = new.conversation_id
      and direct_conversation.type = 'direct'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'user_blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_unsafe_conversation_member
on public.conversation_members;
create trigger prevent_unsafe_conversation_member
before insert on public.conversation_members
for each row
execute function public.prevent_unsafe_conversation_member();

revoke all on function public.prevent_unsafe_conversation_member()
from public, anon, authenticated;

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

drop trigger if exists prevent_unsafe_message on public.messages;
create trigger prevent_unsafe_message
before insert on public.messages
for each row
execute function public.prevent_unsafe_message();

revoke all on function public.prevent_unsafe_message()
from public, anon, authenticated;

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
  where public.is_user_operational(discoverable_profile.user_id)
    and not exists (
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
  uuid, text, text, text, boolean, text
) from public, anon;
grant execute on function public.discover_available_chat_profiles(
  uuid, text, text, text, boolean, text
) to authenticated;

-- These lower-level profile readers do not include bilateral block checks.
-- Keep them available only to owner-run security-definer functions.
revoke execute on function public.get_public_chat_profiles(uuid)
from authenticated;
revoke execute on function public.discover_public_chat_profiles(
  uuid, text, text, text, boolean, text
) from authenticated;

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
    direct_conversation.id,
    other_membership.user_id,
    coalesce(other_profile.public_nickname, '알 수 없는 사용자'),
    coalesce(other_persona.persona_title, '페르소나 정보 없음'),
    coalesce(other_persona.mood_keywords, '[]'::jsonb),
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
          coalesce(own_membership.last_read_at, own_membership.joined_at)
    )
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
    and not exists (
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
  order by coalesce(
    direct_conversation.last_message_at,
    direct_conversation.created_at
  ) desc;
$$;

revoke all on function public.get_my_direct_conversations()
from public, anon;
grant execute on function public.get_my_direct_conversations()
to authenticated;

create or replace function public.get_my_blocked_users()
returns table (
  user_id uuid,
  public_nickname text,
  persona_title text,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    blocked_user.blocked_id,
    coalesce(blocked_profile.public_nickname, '비공개 사용자'),
    coalesce(blocked_persona.persona_title, '페르소나 정보 없음'),
    blocked_user.created_at
  from public.user_blocks as blocked_user
  left join public.profiles as blocked_profile
    on blocked_profile.id = blocked_user.blocked_id
  left join public.personas as blocked_persona
    on blocked_persona.user_id = blocked_user.blocked_id
  where blocked_user.blocker_id = (select auth.uid())
  order by blocked_user.created_at desc;
$$;

revoke all on function public.get_my_blocked_users()
from public, anon;
grant execute on function public.get_my_blocked_users()
to authenticated;

create or replace function public.get_my_reports()
returns table (
  report_id uuid,
  reason text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select report.id, report.reason, report.status, report.created_at
  from public.user_reports as report
  where report.reporter_id = (select auth.uid())
  order by report.created_at desc;
$$;

revoke all on function public.get_my_reports() from public, anon;
grant execute on function public.get_my_reports() to authenticated;

-- Preserve the mutual-consent photo rule. can_view_profile_photo also checks
-- block and moderation state before allowing cross-user access.
drop policy if exists "Authenticated users can view public profile photos"
on storage.objects;
create policy "Authenticated users can view public profile photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.can_view_profile_photo((storage.foldername(name))[1])
);

-- TODO(admin): build moderation administration only behind separate server
-- authentication and explicit admin authorization. A future admin backend
-- may update user_reports review fields and user_moderation_status using a
-- server-only credential. Never expose a service-role key to browser code.
