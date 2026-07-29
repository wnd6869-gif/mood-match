-- Apply before enabling persistence of generated character compositions.
alter table public.personas
  add column if not exists character_composition jsonb null,
  add column if not exists character_asset_version integer null,
  add column if not exists avatar_selection jsonb null;

alter table public.personas
  drop constraint if exists personas_character_composition_object;

alter table public.personas
  add constraint personas_character_composition_object
  check (
    character_composition is null
    or (
      jsonb_typeof(character_composition) = 'object'
      and character_composition ?& array['animal', 'eyes', 'eyebrows', 'mouth', 'background', 'palette', 'seed', 'version']
      and (character_composition ? 'outfitBase' or character_composition ? 'outfit')
      and (character_composition ->> 'version')::integer >= 1
    )
  );

alter table public.personas
  drop constraint if exists personas_avatar_selection_object;

alter table public.personas
  add constraint personas_avatar_selection_object
  check (
    avatar_selection is null
    or (
      jsonb_typeof(avatar_selection) = 'object'
      and avatar_selection ?& array[
        'animalId', 'outfitBaseId', 'faceRigVersion', 'expressionId', 'backgroundId'
      ]
      and (avatar_selection ->> 'faceRigVersion') <> ''
    )
  );

comment on column public.personas.character_composition is
  'Versioned Mood Match animal character recipe; layer paths are resolved by the app manifest.';
comment on column public.personas.character_asset_version is
  'Manifest version used to reproduce the saved character.';
comment on column public.personas.avatar_selection is
  'Immutable avatar recipe: animalId + outfitBaseId + faceRigVersion + expression/accessory/background/effect.';
