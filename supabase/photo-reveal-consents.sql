-- Run this migration after direct-chat.sql, group-chat.sql, and
-- safety-moderation.sql.
--
-- Actual profile photos remain in the private profile-photos bucket. A photo
-- set to "mutual" becomes readable between two active direct-chat members only
-- after both members explicitly consent in that conversation.

create table if not exists public.photo_reveal_consents (
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  user_id uuid not null
    references auth.users (id) on delete cascade,
  consented boolean not null default false,
  consented_at timestamptz null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  constraint photo_reveal_consent_times_valid
    check (
      (
        consented = true
        and consented_at is not null
        and revoked_at is null
      )
      or (
        consented = false
        and consented_at is null
      )
    )
);

create index if not exists photo_reveal_consents_user_idx
on public.photo_reveal_consents (user_id, updated_at desc);

alter table public.photo_reveal_consents enable row level security;

drop policy if exists "Direct chat members can view photo consents"
on public.photo_reveal_consents;
create policy "Direct chat members can view photo consents"
on public.photo_reveal_consents
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members as own_membership
    inner join public.conversations as direct_conversation
      on direct_conversation.id = own_membership.conversation_id
    where own_membership.conversation_id =
        photo_reveal_consents.conversation_id
      and own_membership.user_id = (select auth.uid())
      and own_membership.left_at is null
      and direct_conversation.type = 'direct'
      and direct_conversation.archived_at is null
  )
);

revoke all on table public.photo_reveal_consents
from public, anon, authenticated;
grant select on table public.photo_reveal_consents to authenticated;

create or replace function public.get_photo_reveal_status(
  target_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_other_user_id uuid;
  v_own_visibility text;
  v_other_visibility text;
  v_own_consented boolean := false;
  v_other_consented boolean := false;
  v_available boolean := false;
  v_blocked boolean := false;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  select other_membership.user_id
  into v_other_user_id
  from public.conversation_members as own_membership
  inner join public.conversations as direct_conversation
    on direct_conversation.id = own_membership.conversation_id
  inner join public.conversation_members as other_membership
    on other_membership.conversation_id = direct_conversation.id
    and other_membership.user_id <> own_membership.user_id
    and other_membership.left_at is null
  where own_membership.conversation_id = target_conversation_id
    and own_membership.user_id = v_user_id
    and own_membership.left_at is null
    and direct_conversation.type = 'direct'
    and direct_conversation.archived_at is null;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'direct_conversation_required';
  end if;

  select profile.photo_visibility
  into v_own_visibility
  from public.profiles as profile
  where profile.id = v_user_id;

  select profile.photo_visibility
  into v_other_visibility
  from public.profiles as profile
  where profile.id = v_other_user_id;

  select coalesce(consent.consented, false)
  into v_own_consented
  from public.photo_reveal_consents as consent
  where consent.conversation_id = target_conversation_id
    and consent.user_id = v_user_id;

  if not found then
    v_own_consented := false;
  end if;

  select coalesce(consent.consented, false)
  into v_other_consented
  from public.photo_reveal_consents as consent
  where consent.conversation_id = target_conversation_id
    and consent.user_id = v_other_user_id;

  if not found then
    v_other_consented := false;
  end if;

  v_blocked := exists (
    select 1
    from public.user_blocks as blocked_pair
    where (
      blocked_pair.blocker_id = v_user_id
      and blocked_pair.blocked_id = v_other_user_id
    )
    or (
      blocked_pair.blocker_id = v_other_user_id
      and blocked_pair.blocked_id = v_user_id
    )
  );

  v_available :=
    v_own_visibility = 'mutual'
    and v_other_visibility = 'mutual'
    and not v_blocked
    and public.is_user_operational(v_user_id)
    and public.is_user_operational(v_other_user_id);

  return pg_catalog.jsonb_build_object(
    'conversation_id', target_conversation_id,
    'other_user_id', v_other_user_id,
    'own_photo_visibility', coalesce(v_own_visibility, 'persona_only'),
    'other_photo_visibility', coalesce(
      v_other_visibility,
      'persona_only'
    ),
    'available', v_available,
    'own_consented', v_own_consented,
    'other_consented', v_other_consented,
    'revealed',
      v_available and v_own_consented and v_other_consented
  );
end;
$$;

revoke all on function public.get_photo_reveal_status(uuid)
from public, anon;
grant execute on function public.get_photo_reveal_status(uuid)
to authenticated;

create or replace function public.set_photo_reveal_consent(
  target_conversation_id uuid,
  next_consented boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_status jsonb;
begin
  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  if next_consented is null then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_photo_consent';
  end if;

  v_status := public.get_photo_reveal_status(
    target_conversation_id
  );

  if next_consented and not coalesce(
    (v_status ->> 'available')::boolean,
    false
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'mutual_photo_setting_required';
  end if;

  insert into public.photo_reveal_consents (
    conversation_id,
    user_id,
    consented,
    consented_at,
    revoked_at,
    updated_at
  )
  values (
    target_conversation_id,
    v_user_id,
    next_consented,
    case when next_consented then now() else null end,
    case when next_consented then null else now() end,
    now()
  )
  on conflict (conversation_id, user_id)
  do update set
    consented = excluded.consented,
    consented_at = excluded.consented_at,
    revoked_at = excluded.revoked_at,
    updated_at = excluded.updated_at;

  return public.get_photo_reveal_status(target_conversation_id);
end;
$$;

revoke all on function public.set_photo_reveal_consent(uuid, boolean)
from public, anon;
grant execute on function public.set_photo_reveal_consent(uuid, boolean)
to authenticated;

create or replace function public.can_view_profile_photo(
  photo_owner_id text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    photo_owner_id = (select auth.uid())::text
    or exists (
      select 1
      from public.discover_available_chat_profiles(
        null::uuid,
        null::text,
        null::text,
        null::text,
        false,
        null::text
      ) as public_profile
      where public_profile.user_id::text = photo_owner_id
        and public_profile.photo_visibility = 'public'
    )
    or exists (
      select 1
      from public.conversations as direct_conversation
      inner join public.conversation_members as own_membership
        on own_membership.conversation_id = direct_conversation.id
        and own_membership.user_id = (select auth.uid())
        and own_membership.left_at is null
      inner join public.conversation_members as owner_membership
        on owner_membership.conversation_id = direct_conversation.id
        and owner_membership.user_id::text = photo_owner_id
        and owner_membership.left_at is null
      inner join public.profiles as own_profile
        on own_profile.id = own_membership.user_id
      inner join public.profiles as owner_profile
        on owner_profile.id = owner_membership.user_id
      inner join public.photo_reveal_consents as own_consent
        on own_consent.conversation_id = direct_conversation.id
        and own_consent.user_id = own_membership.user_id
        and own_consent.consented = true
      inner join public.photo_reveal_consents as owner_consent
        on owner_consent.conversation_id = direct_conversation.id
        and owner_consent.user_id = owner_membership.user_id
        and owner_consent.consented = true
      where direct_conversation.type = 'direct'
        and direct_conversation.archived_at is null
        and own_profile.photo_visibility = 'mutual'
        and owner_profile.photo_visibility = 'mutual'
        and public.is_user_operational(own_membership.user_id)
        and public.is_user_operational(owner_membership.user_id)
        and not exists (
          select 1
          from public.user_blocks as blocked_pair
          where (
            blocked_pair.blocker_id = own_membership.user_id
            and blocked_pair.blocked_id = owner_membership.user_id
          )
          or (
            blocked_pair.blocker_id = owner_membership.user_id
            and blocked_pair.blocked_id = own_membership.user_id
          )
        )
    );
$$;

revoke all on function public.can_view_profile_photo(text)
from public, anon;
grant execute on function public.can_view_profile_photo(text)
to authenticated;

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
      and tablename = 'photo_reveal_consents'
  ) then
    alter publication supabase_realtime
    add table public.photo_reveal_consents;
  end if;
end
$$;
