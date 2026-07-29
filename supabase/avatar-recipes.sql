-- Avatar recipes are data, not per-user generated image files. Apply after
-- supabase/character-compositions.sql. Existing persona RLS policies remain
-- valid because these fields live on the same owner-scoped table.
alter table public.personas
  add column if not exists character_recipe jsonb null,
  add column if not exists avatar_system_version text null,
  add column if not exists avatar_updated_at timestamptz null;

alter table public.personas
  drop constraint if exists personas_character_recipe_object;

alter table public.personas
  add constraint personas_character_recipe_object
  check (
    character_recipe is null or (
      jsonb_typeof(character_recipe) = 'object'
      and character_recipe ?& array[
        'systemVersion', 'animalId', 'outfitBaseId', 'faceFamily',
        'faceRigVersion', 'expressionId', 'backgroundId', 'castingSeed',
        'signals', 'rationale'
      ]
      and character_recipe ->> 'systemVersion' = 'avatar-v1'
      and jsonb_typeof(character_recipe -> 'signals') = 'object'
    )
  );

comment on column public.personas.character_recipe is
  'Persisted avatar-v1 casting recipe. App resolves approved local layers; no generated avatar file is stored.';
comment on column public.personas.avatar_system_version is
  'Avatar renderer/catalog system version used for the saved recipe.';
comment on column public.personas.avatar_updated_at is
  'When the user last explicitly re-analysed a photo and received a new recipe.';

-- Lets public-profile cards reuse a saved recipe without exposing the source
-- photo or raw analysis fields. Conversation members can also retrieve each
-- other's recipe after a chat has begun.
create or replace function public.get_visible_avatar_recipes(p_user_ids uuid[])
returns table (user_id uuid, character_recipe jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select persona.user_id, persona.character_recipe
  from public.personas as persona
  where persona.user_id = any(p_user_ids)
    and persona.character_recipe is not null
    and (
      exists (
        select 1 from public.profiles as profile
        where profile.id = persona.user_id and profile.is_public = true
      )
      or exists (
        select 1
        from public.conversation_members as mine
        join public.conversation_members as theirs
          on theirs.conversation_id = mine.conversation_id
        where mine.user_id = (select auth.uid())
          and theirs.user_id = persona.user_id
          and mine.left_at is null and theirs.left_at is null
      )
    );
$$;

revoke all on function public.get_visible_avatar_recipes(uuid[]) from public, anon;
grant execute on function public.get_visible_avatar_recipes(uuid[]) to authenticated;
