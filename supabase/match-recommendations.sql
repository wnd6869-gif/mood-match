-- Run after profiles.sql, public-chat-profile.sql, persona-identity.sql, and
-- photo-reveal-consents.sql.
--
-- Stores recommendation preferences on the server and narrows real-photo
-- exposure to persona-only or explicit mutual consent.

create table if not exists public.match_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  visual_archetype text not null,
  preferred_animal text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_preferences_visual_archetype_valid
    check (
      visual_archetype in (
        'friendly_warm',
        'cute_cozy',
        'calm_mysterious',
        'smart_stylish',
        'reliable_strong',
        'bright_playful'
      )
    ),
  constraint match_preferences_preferred_animal_valid
    check (
      preferred_animal is null
      or preferred_animal in (
        '강아지',
        '고양이',
        '여우',
        '토끼',
        '수달',
        '햄스터',
        '곰',
        '늑대',
        '사슴'
      )
    )
);

alter table public.match_preferences enable row level security;

drop policy if exists "Users can view their own match preferences"
on public.match_preferences;
create policy "Users can view their own match preferences"
on public.match_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own match preferences"
on public.match_preferences;
create policy "Users can create their own match preferences"
on public.match_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own match preferences"
on public.match_preferences;
create policy "Users can update their own match preferences"
on public.match_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on table public.match_preferences
to authenticated;
revoke delete on table public.match_preferences from authenticated;
revoke all on table public.match_preferences from anon;

create or replace function public.set_match_preferences_updated_at()
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

revoke all on function public.set_match_preferences_updated_at()
from public, anon, authenticated;

drop trigger if exists set_match_preferences_updated_at
on public.match_preferences;
create trigger set_match_preferences_updated_at
before update on public.match_preferences
for each row
execute function public.set_match_preferences_updated_at();

-- The redesigned service never exposes a real photo immediately. Accounts
-- that previously selected "public" are moved to the safer mutual-consent
-- mode before the constraint is narrowed.
update public.profiles
set photo_visibility = 'mutual'
where photo_visibility = 'public';

alter table public.profiles
drop constraint if exists profiles_photo_visibility_valid;

alter table public.profiles
add constraint profiles_photo_visibility_valid
check (photo_visibility in ('persona_only', 'mutual'));
