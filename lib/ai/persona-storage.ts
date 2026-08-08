import {
  detectProfilePhotoMimeType,
  PROFILE_PHOTO_BUCKET,
  PROFILE_PHOTO_FILE_NAMES,
  PROFILE_PHOTO_MAX_SIZE_BYTES,
} from "@/lib/profile-photo";
import type { createClient } from "@/lib/supabase/server";
import type { castCharacter, recipeToComposition } from "@/lib/character-casting";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export { detectProfilePhotoMimeType, PROFILE_PHOTO_MAX_SIZE_BYTES };

export async function downloadStoredProfilePhoto(supabase: Supabase, userId: string) {
  for (const fileName of PROFILE_PHOTO_FILE_NAMES) {
    const objectPath = `${userId}/${fileName}`;
    const { data, error } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).download(objectPath);
    if (!error && data) return { imageBlob: data, objectPath };
  }
  return null;
}

function isCheckConstraintViolation(error: { code?: string } | null) {
  return error?.code === "23514";
}

function isOptionalPersonaFieldCompatibilityError(error: { code?: string } | null) {
  // 42703 is PostgreSQL's undefined_column error. PGRST204 is returned when
  // PostgREST's schema cache does not know one of the optional columns yet.
  // In both cases, retrying with the stable analysis fields keeps a completed
  // OpenAI result from being discarded during a staged database rollout.
  return error?.code === "42703" || error?.code === "PGRST204";
}

function toCorePersonaFields(personaFields: Record<string, unknown>) {
  return {
    user_id: personaFields.user_id,
    photo_path: personaFields.photo_path,
    animal_types: personaFields.animal_types,
    mood_keywords: personaFields.mood_keywords,
    persona_title: personaFields.persona_title,
    persona_description: personaFields.persona_description,
    nickname_candidates: personaFields.nickname_candidates,
  };
}

export async function persistPersonaAnalysis(
  supabase: Supabase,
  personaFields: Record<string, unknown>,
  recipe: ReturnType<typeof castCharacter>,
  composition: ReturnType<typeof recipeToComposition>,
) {
  // The analysis result is the source of truth. Persist it before optional
  // renderer metadata so an avatar-v1 constraint cannot turn a valid OpenAI
  // response into a failed character creation.
  let { error } = await supabase.from("personas").upsert(personaFields, {
    onConflict: "user_id",
  });

  // Older production databases can have a stricter visual_traits check than
  // the current JSON schema. Traits are display-only and can be deterministically
  // derived from the persisted Top 3, so never lose a completed analysis here.
  if (isCheckConstraintViolation(error)) {
    ({ error } = await supabase.from("personas").upsert(
      { ...personaFields, visual_traits: null },
      { onConflict: "user_id" },
    ));
  }

  // The analysis result itself only depends on the stable fields below.
  // Optional model telemetry and display traits may be introduced after a
  // deployment, so use this safe fallback for a partially migrated database.
  // Never apply it to authorization/RLS errors: those must remain visible.
  if (
    isCheckConstraintViolation(error) ||
    isOptionalPersonaFieldCompatibilityError(error)
  ) {
    ({ error } = await supabase.from("personas").upsert(
      toCorePersonaFields(personaFields),
      { onConflict: "user_id" },
    ));
  }

  if (error) return { error, avatarError: null };

  const { error: avatarError } = await supabase
    .from("personas")
    .update({
      character_composition: composition,
      character_asset_version: composition.version,
      avatar_selection: composition.avatarSelection ?? null,
      character_recipe: recipe,
      avatar_system_version: recipe.systemVersion,
      avatar_updated_at: new Date().toISOString(),
    })
    .eq("user_id", String(personaFields.user_id));

  // Metadata can be unavailable while a production database is being
  // migrated. The core result stays usable and the caller records the safe
  // error code for follow-up instead of failing the user-visible analysis.
  return { error: null, avatarError };
}
