-- Run this file manually in the Supabase SQL Editor.
-- It requires profiles, personas, public-chat-profile.sql, and the private
-- profile-photos bucket to exist. No chat rooms or messages are created here.

create table if not exists public.conversation_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  message text null,
  source text not null default 'profile',
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint conversation_requests_different_users
    check (sender_id <> receiver_id),
  constraint conversation_requests_status_valid
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  constraint conversation_requests_source_valid
    check (source in ('profile', 'recommendation', 'group_room')),
  constraint conversation_requests_message_valid
    check (
      message is null
      or (
        message = btrim(message)
        and char_length(message) between 1 and 120
      )
    ),
  constraint conversation_requests_response_time_valid
    check (
      (status = 'pending' and responded_at is null)
      or (status <> 'pending' and responded_at is not null)
    )
);

create unique index if not exists conversation_requests_pending_pair_key
on public.conversation_requests (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
)
where status = 'pending';

create index if not exists conversation_requests_sender_status_idx
on public.conversation_requests (sender_id, status, created_at desc);

create index if not exists conversation_requests_receiver_status_idx
on public.conversation_requests (receiver_id, status, created_at desc);

create index if not exists conversation_requests_status_idx
on public.conversation_requests (status, created_at desc);

alter table public.conversation_requests enable row level security;

drop policy if exists "Participants can view conversation requests"
on public.conversation_requests;
create policy "Participants can view conversation requests"
on public.conversation_requests
for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (select auth.uid()) = receiver_id
);

drop policy if exists "Senders can create conversation requests"
on public.conversation_requests;
create policy "Senders can create conversation requests"
on public.conversation_requests
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and sender_id <> receiver_id
  and status = 'pending'
  and responded_at is null
  and exists (
    select 1
    from public.get_public_chat_profiles(receiver_id) as target_profile
    where target_profile.user_id = receiver_id
      and target_profile.preferred_group_size in ('one_to_one', 'both')
  )
);

drop policy if exists "Receivers can respond to pending requests"
on public.conversation_requests;
create policy "Receivers can respond to pending requests"
on public.conversation_requests
for update
to authenticated
using (
  (select auth.uid()) = receiver_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = receiver_id
  and status in ('accepted', 'declined')
  and responded_at is not null
);

drop policy if exists "Senders can cancel pending requests"
on public.conversation_requests;
create policy "Senders can cancel pending requests"
on public.conversation_requests
for update
to authenticated
using (
  (select auth.uid()) = sender_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = sender_id
  and status = 'cancelled'
  and responded_at is not null
);

revoke all on table public.conversation_requests from anon;
revoke all on table public.conversation_requests from authenticated;
grant select, insert on table public.conversation_requests to authenticated;
grant update (status, responded_at)
on table public.conversation_requests
to authenticated;

-- TODO(blocks): add block-list checks to the policies and RPCs when a
-- dedicated user_blocks table is introduced. No temporary block behavior is
-- simulated in this prototype.

create or replace function public.send_conversation_request(
  target_user_id uuid,
  intro_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := (select auth.uid());
  v_message text := nullif(btrim(intro_message), '');
  v_target_group_size text;
  v_existing_sender_id uuid;
  v_request_id uuid;
  v_pair_key text;
begin
  if v_sender_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if target_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'target_required';
  end if;

  if v_sender_id = target_user_id then
    raise exception using
      errcode = 'P0001',
      message = 'self_request';
  end if;

  if v_message is not null and char_length(v_message) > 120 then
    raise exception using
      errcode = 'P0001',
      message = 'message_too_long';
  end if;

  select target_profile.preferred_group_size
  into v_target_group_size
  from public.profiles as target_profile
  where target_profile.id = target_user_id
    and target_profile.is_public = true
    and target_profile.public_nickname is not null
    and target_profile.conversation_goal is not null
    and cardinality(target_profile.conversation_moods) between 1 and 4
    and cardinality(target_profile.conversation_topics) between 1 and 6
    and target_profile.conversation_pace is not null
    and target_profile.preferred_group_size is not null
    and cardinality(target_profile.available_time_slots) between 1 and 4
    and exists (
      select 1
      from public.personas as target_persona
      where target_persona.user_id = target_profile.id
    );

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'target_unavailable';
  end if;

  if v_target_group_size not in ('one_to_one', 'both') then
    raise exception using
      errcode = 'P0001',
      message = 'target_not_one_to_one';
  end if;

  v_pair_key :=
    least(v_sender_id::text, target_user_id::text)
    || ':'
    || greatest(v_sender_id::text, target_user_id::text);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_pair_key, 0)
  );

  if exists (
    select 1
    from public.conversation_requests as existing_request
    where existing_request.status = 'accepted'
      and (
        (
          existing_request.sender_id = v_sender_id
          and existing_request.receiver_id = target_user_id
        )
        or (
          existing_request.sender_id = target_user_id
          and existing_request.receiver_id = v_sender_id
        )
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'already_connected';
  end if;

  select existing_request.sender_id
  into v_existing_sender_id
  from public.conversation_requests as existing_request
  where existing_request.status = 'pending'
    and (
      (
        existing_request.sender_id = v_sender_id
        and existing_request.receiver_id = target_user_id
      )
      or (
        existing_request.sender_id = target_user_id
        and existing_request.receiver_id = v_sender_id
      )
    )
  limit 1;

  if found then
    if v_existing_sender_id = v_sender_id then
      raise exception using
        errcode = 'P0001',
        message = 'already_pending';
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'reverse_pending';
  end if;

  insert into public.conversation_requests (
    sender_id,
    receiver_id,
    status,
    message,
    source
  )
  values (
    v_sender_id,
    target_user_id,
    'pending',
    v_message,
    'profile'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.send_conversation_request(uuid, text)
from public;
revoke all on function public.send_conversation_request(uuid, text)
from anon;
grant execute on function public.send_conversation_request(uuid, text)
to authenticated;

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
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if response not in ('accepted', 'declined') then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_response';
  end if;

  update public.conversation_requests
  set
    status = response,
    responded_at = now()
  where id = request_id
    and receiver_id = v_receiver_id
    and status = 'pending';

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'request_not_actionable';
  end if;
end;
$$;

revoke all on function public.respond_to_conversation_request(uuid, text)
from public;
revoke all on function public.respond_to_conversation_request(uuid, text)
from anon;
grant execute on function public.respond_to_conversation_request(uuid, text)
to authenticated;

create or replace function public.cancel_conversation_request(
  request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := (select auth.uid());
begin
  if v_sender_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  update public.conversation_requests
  set
    status = 'cancelled',
    responded_at = now()
  where id = request_id
    and sender_id = v_sender_id
    and status = 'pending';

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'request_not_actionable';
  end if;
end;
$$;

revoke all on function public.cancel_conversation_request(uuid)
from public;
revoke all on function public.cancel_conversation_request(uuid)
from anon;
grant execute on function public.cancel_conversation_request(uuid)
to authenticated;

-- Server-filtered discovery result. Only explicitly public character fields
-- are returned. Email, raw birth data, birth time, Storage paths, and internal
-- persona metadata are intentionally absent.
create or replace function public.discover_public_chat_profiles(
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
  select
    target_profile.id as user_id,
    target_profile.public_nickname,
    target_profile.public_bio,
    target_persona.persona_title,
    target_persona.persona_description,
    target_persona.animal_types,
    target_persona.mood_keywords,
    case
      when target_profile.age_visibility = 'hidden'
        or target_profile.birth_date is null then null
      when target_profile.age_visibility = 'exact' then
        (
          extract(
            year from pg_catalog.age(
              (pg_catalog.now() at time zone 'Asia/Seoul')::date,
              target_profile.birth_date
            )
          )::integer
        )::text || '세'
      else
        (
          (
            extract(
              year from pg_catalog.age(
                (pg_catalog.now() at time zone 'Asia/Seoul')::date,
                target_profile.birth_date
              )
            )::integer / 10
          ) * 10
        )::text || '대'
    end as age_display,
    target_profile.photo_visibility,
    target_profile.conversation_goal,
    target_profile.conversation_moods,
    target_profile.conversation_topics,
    target_profile.conversation_pace,
    target_profile.preferred_group_size,
    target_profile.available_time_slots,
    relationship.request_id,
    relationship.request_status,
    relationship.request_direction
  from public.profiles as target_profile
  inner join public.personas as target_persona
    on target_persona.user_id = target_profile.id
  left join lateral (
    select
      existing_request.id as request_id,
      existing_request.status as request_status,
      case
        when existing_request.sender_id = (select auth.uid())
          then 'sent'
        else 'received'
      end as request_direction
    from public.conversation_requests as existing_request
    where (
      (
        existing_request.sender_id = (select auth.uid())
        and existing_request.receiver_id = target_profile.id
      )
      or (
        existing_request.sender_id = target_profile.id
        and existing_request.receiver_id = (select auth.uid())
      )
    )
    order by
      case existing_request.status
        when 'pending' then 0
        when 'accepted' then 1
        else 2
      end,
      existing_request.created_at desc
    limit 1
  ) as relationship on true
  where (select auth.uid()) is not null
    and target_profile.is_public = true
    and target_profile.public_nickname is not null
    and target_profile.conversation_goal is not null
    and cardinality(target_profile.conversation_moods) between 1 and 4
    and cardinality(target_profile.conversation_topics) between 1 and 6
    and target_profile.conversation_pace is not null
    and target_profile.preferred_group_size is not null
    and cardinality(target_profile.available_time_slots) between 1 and 4
    and (
      (
        p_target_user_id is null
        and target_profile.id <> (select auth.uid())
      )
      or target_profile.id = p_target_user_id
    )
    and (
      p_goal is null
      or target_profile.conversation_goal = p_goal
    )
    and (
      p_mood is null
      or p_mood = any(target_profile.conversation_moods)
    )
    and (
      p_topic is null
      or p_topic = any(target_profile.conversation_topics)
    )
    and (
      not p_one_to_one_only
      or target_profile.preferred_group_size in ('one_to_one', 'both')
    )
    and (
      p_time_slot is null
      or p_time_slot = any(target_profile.available_time_slots)
    )
  order by
    case
      when target_profile.preferred_group_size in ('one_to_one', 'both')
        then 0
      else 1
    end,
    target_profile.updated_at desc;
$$;

revoke all on function public.discover_public_chat_profiles(
  uuid,
  text,
  text,
  text,
  boolean,
  text
) from public;
revoke all on function public.discover_public_chat_profiles(
  uuid,
  text,
  text,
  text,
  boolean,
  text
) from anon;
grant execute on function public.discover_public_chat_profiles(
  uuid,
  text,
  text,
  text,
  boolean,
  text
) to authenticated;

create or replace function public.get_my_conversation_requests()
returns table (
  request_id uuid,
  direction text,
  other_user_id uuid,
  other_public_nickname text,
  other_persona_title text,
  message text,
  status text,
  created_at timestamptz,
  responded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    conversation_request.id as request_id,
    case
      when conversation_request.sender_id = (select auth.uid())
        then 'sent'
      else 'received'
    end as direction,
    case
      when conversation_request.sender_id = (select auth.uid())
        then conversation_request.receiver_id
      else conversation_request.sender_id
    end as other_user_id,
    other_profile.public_nickname as other_public_nickname,
    other_persona.persona_title as other_persona_title,
    conversation_request.message,
    conversation_request.status,
    conversation_request.created_at,
    conversation_request.responded_at
  from public.conversation_requests as conversation_request
  left join public.profiles as other_profile
    on other_profile.id = case
      when conversation_request.sender_id = (select auth.uid())
        then conversation_request.receiver_id
      else conversation_request.sender_id
    end
  left join public.personas as other_persona
    on other_persona.user_id = other_profile.id
  where (select auth.uid()) is not null
    and (
      conversation_request.sender_id = (select auth.uid())
      or conversation_request.receiver_id = (select auth.uid())
    )
  order by conversation_request.created_at desc;
$$;

revoke all on function public.get_my_conversation_requests() from public;
revoke all on function public.get_my_conversation_requests() from anon;
grant execute on function public.get_my_conversation_requests()
to authenticated;

-- The bucket remains private. Only photos explicitly marked public can be
-- selected by another authenticated user for a short-lived signed URL.
-- "mutual" deliberately receives no cross-user Storage access until mutual
-- consent has a dedicated database model.
drop policy if exists "Authenticated users can view public profile photos"
on storage.objects;
create policy "Authenticated users can view public profile photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and exists (
    select 1
    from public.get_public_chat_profiles(null::uuid) as photo_owner
    where photo_owner.user_id::text = (storage.foldername(name))[1]
      and photo_owner.photo_visibility = 'public'
  )
);
