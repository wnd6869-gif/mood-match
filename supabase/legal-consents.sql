-- Run this file manually in the Supabase SQL Editor after admin.sql.
-- It records signup consent without granting clients direct write access to
-- required agreement evidence.
--
-- TODO(운영자): Existing users are intentionally not backfilled because a
-- database migration is not proof of consent. Obtain a fresh agreement before
-- inserting records for existing accounts.
-- TODO(운영자): Keep these versions synchronized with lib/legal.ts whenever
-- the terms or privacy policy materially changes.

create table if not exists public.consent_records (
  user_id uuid primary key references auth.users (id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  terms_agreed_at timestamptz not null,
  privacy_agreed_at timestamptz not null,
  marketing_agreed boolean not null default false,
  marketing_agreed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_records_terms_version_present
    check (char_length(btrim(terms_version)) between 1 and 80),
  constraint consent_records_privacy_version_present
    check (char_length(btrim(privacy_version)) between 1 and 80),
  constraint consent_records_marketing_timestamp_valid
    check (
      not marketing_agreed
      or marketing_agreed_at is not null
    )
);

alter table public.consent_records enable row level security;

drop policy if exists "Users can view their own consent record"
on public.consent_records;
create policy "Users can view their own consent record"
on public.consent_records
for select
to authenticated
using (user_id = (select auth.uid()));

-- Required consent evidence cannot be inserted, updated, or deleted directly
-- by a browser client. New records come only from the auth.users trigger below,
-- and marketing preference changes go through a field-limited RPC.
revoke all on table public.consent_records from anon, authenticated;
grant select on table public.consent_records to authenticated;

create or replace function public.set_consent_records_updated_at()
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

drop trigger if exists set_consent_records_updated_at
on public.consent_records;
create trigger set_consent_records_updated_at
before update on public.consent_records
for each row
execute function public.set_consent_records_updated_at();

create or replace function public.record_signup_legal_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms_version constant text := '2026-07-28-beta-1';
  v_privacy_version constant text := '2026-07-28-beta-1';
  v_metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_marketing_agreed boolean :=
    coalesce(v_metadata -> 'marketing_agreed' = 'true'::jsonb, false);
begin
  if v_metadata -> 'terms_agreed' is distinct from 'true'::jsonb
    or v_metadata -> 'privacy_agreed' is distinct from 'true'::jsonb
    or v_metadata ->> 'terms_version' is distinct from v_terms_version
    or v_metadata ->> 'privacy_version' is distinct from v_privacy_version
  then
    raise exception 'required_legal_consent_missing';
  end if;

  insert into public.consent_records (
    user_id,
    terms_version,
    privacy_version,
    terms_agreed_at,
    privacy_agreed_at,
    marketing_agreed,
    marketing_agreed_at
  )
  values (
    new.id,
    v_terms_version,
    v_privacy_version,
    now(),
    now(),
    v_marketing_agreed,
    case when v_marketing_agreed then now() else null end
  );

  return new;
end;
$$;

revoke all on function public.record_signup_legal_consent()
from public, anon, authenticated;

drop trigger if exists record_signup_legal_consent
on auth.users;
create trigger record_signup_legal_consent
after insert on auth.users
for each row
execute function public.record_signup_legal_consent();

create or replace function public.update_my_marketing_consent(
  p_marketing_agreed boolean
)
returns public.consent_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_record public.consent_records;
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  update public.consent_records
  set
    marketing_agreed = p_marketing_agreed,
    marketing_agreed_at =
      case
        when p_marketing_agreed and not marketing_agreed then now()
        else marketing_agreed_at
      end
  where user_id = v_user_id
  returning * into v_record;

  if not found then
    raise exception 'consent_record_not_found';
  end if;

  return v_record;
end;
$$;

revoke all on function public.update_my_marketing_consent(boolean)
from public, anon;
grant execute on function public.update_my_marketing_consent(boolean)
to authenticated;

-- Only admin and super_admin roles can inspect one user's consent evidence.
-- The RPC does not expose email, profile, chat, or other unrelated data.
create or replace function public.admin_get_user_consent(
  target_user_id uuid
)
returns table (
  user_id uuid,
  terms_version text,
  privacy_version text,
  terms_agreed_at timestamptz,
  privacy_agreed_at timestamptz,
  marketing_agreed boolean,
  marketing_agreed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(
    public.get_admin_role() in ('admin', 'super_admin'),
    false
  ) then
    raise exception 'admin_required';
  end if;

  return query
  select
    consent.user_id,
    consent.terms_version,
    consent.privacy_version,
    consent.terms_agreed_at,
    consent.privacy_agreed_at,
    consent.marketing_agreed,
    consent.marketing_agreed_at,
    consent.created_at,
    consent.updated_at
  from public.consent_records as consent
  where consent.user_id = target_user_id;
end;
$$;

revoke all on function public.admin_get_user_consent(uuid)
from public, anon;
grant execute on function public.admin_get_user_consent(uuid)
to authenticated;

-- Enforce the service's stated minimum age for new or edited profiles.
create or replace function public.validate_profile_minimum_age()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.birth_date >
    (now() at time zone 'Asia/Seoul')::date - interval '14 years'
  then
    raise exception 'minimum_age_required';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_profile_minimum_age
on public.profiles;
create trigger validate_profile_minimum_age
before insert or update of birth_date on public.profiles
for each row
execute function public.validate_profile_minimum_age();
