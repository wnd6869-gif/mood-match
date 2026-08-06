-- Align the persisted avatar-v1 JSON checks with the current application.
-- This replaces earlier variants that could reject a valid composition.

alter table public.personas
  add column if not exists character_composition jsonb null,
  add column if not exists character_asset_version integer null,
  add column if not exists avatar_selection jsonb null,
  add column if not exists character_recipe jsonb null,
  add column if not exists avatar_system_version text null,
  add column if not exists avatar_updated_at timestamptz null;

alter table public.personas
  drop constraint if exists personas_character_composition_object,
  drop constraint if exists personas_avatar_selection_object,
  drop constraint if exists personas_character_recipe_object;

alter table public.personas
  add constraint personas_character_composition_object
  check (
    character_composition is null or (
      jsonb_typeof(character_composition) = 'object'
      and character_composition ?& array['animal', 'eyes', 'eyebrows', 'mouth', 'background', 'palette', 'seed', 'version']
      and (character_composition ? 'outfitBase' or character_composition ? 'outfit')
      and (character_composition ->> 'version')::integer >= 1
    )
  ),
  add constraint personas_avatar_selection_object
  check (
    avatar_selection is null or (
      jsonb_typeof(avatar_selection) = 'object'
      and avatar_selection ?& array['animalId', 'outfitBaseId', 'faceRigVersion', 'expressionId', 'backgroundId']
      and coalesce(avatar_selection ->> 'faceRigVersion', '') <> ''
    )
  ),
  add constraint personas_character_recipe_object
  check (
    character_recipe is null or (
      jsonb_typeof(character_recipe) = 'object'
      and character_recipe ?& array['systemVersion', 'animalId', 'outfitBaseId', 'faceFamily', 'faceRigVersion', 'expressionId', 'backgroundId', 'castingSeed', 'signals', 'rationale']
      and character_recipe ->> 'systemVersion' = 'avatar-v1'
      and jsonb_typeof(character_recipe -> 'signals') = 'object'
    )
  );

notify pgrst, 'reload schema';
