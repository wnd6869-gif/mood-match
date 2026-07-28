-- Run this migration manually in the Supabase SQL Editor.
-- Existing persona rows remain valid because visual_traits is nullable.

alter table public.personas
  add column if not exists visual_traits jsonb null;

alter table public.personas
  drop constraint if exists personas_visual_traits_object;

alter table public.personas
  add constraint personas_visual_traits_object
  check (
    visual_traits is null
    or (
      jsonb_typeof(visual_traits) = 'object'
      and visual_traits ?& array[
        'friendly',
        'cute',
        'calm',
        'playful',
        'stylish',
        'reliable'
      ]
      and jsonb_typeof(visual_traits -> 'friendly') = 'number'
      and jsonb_typeof(visual_traits -> 'cute') = 'number'
      and jsonb_typeof(visual_traits -> 'calm') = 'number'
      and jsonb_typeof(visual_traits -> 'playful') = 'number'
      and jsonb_typeof(visual_traits -> 'stylish') = 'number'
      and jsonb_typeof(visual_traits -> 'reliable') = 'number'
      and (visual_traits ->> 'friendly')::numeric between 0 and 100
      and (visual_traits ->> 'cute')::numeric between 0 and 100
      and (visual_traits ->> 'calm')::numeric between 0 and 100
      and (visual_traits ->> 'playful')::numeric between 0 and 100
      and (visual_traits ->> 'stylish')::numeric between 0 and 100
      and (visual_traits ->> 'reliable')::numeric between 0 and 100
    )
  );
