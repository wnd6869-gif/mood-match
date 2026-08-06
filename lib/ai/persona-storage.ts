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

function isAvatarPersistenceIncompatible(error: { code?: string; message?: string; constraint?: string } | null) {
  if (!error) return false;
  // A production database may be between the legacy persona schema and the
  // avatar-v1 migration. The core analysis columns are still valid, so retry
  // without only the optional renderer columns instead of discarding a valid
  // OpenAI result. The migration restores full recipe persistence.
  return error.code === "PGRST204" || error.code === "42703" ||
    (error.code === "23514" && /persona.*(avatar|character)|(?:avatar|character).*persona/i.test(`${error.constraint ?? ""} ${error.message ?? ""}`)) ||
    /avatar_selection|character_composition|character_asset_version|character_recipe|avatar_system_version|avatar_updated_at/i.test(error.message ?? "");
}

function isCheckConstraintViolation(error: { code?: string } | null) {
  return error?.code === "23514";
}

export async function persistPersonaAnalysis(
  supabase: Supabase,
  personaFields: Record<string, unknown>,
  recipe: ReturnType<typeof castCharacter>,
  composition: ReturnType<typeof recipeToComposition>,
) {
  let { error } = await supabase.from("personas").upsert(
    {
      ...personaFields,
      character_composition: composition,
      character_asset_version: composition.version,
      avatar_selection: composition.avatarSelection ?? null,
      character_recipe: recipe,
      avatar_system_version: recipe.systemVersion,
      avatar_updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (isAvatarPersistenceIncompatible(error)) {
    ({ error } = await supabase.from("personas").upsert(personaFields, {
      onConflict: "user_id",
    }));
  }

  // Older production databases can have a stricter visual_traits check than
  // the current JSON schema. Traits are display-only and can be deterministically
  // derived from the persisted Top 3, so never lose a completed analysis here.
  if (isCheckConstraintViolation(error)) {
    ({ error } = await supabase.from("personas").upsert(
      { ...personaFields, visual_traits: null },
      { onConflict: "user_id" },
    ));
  }

  return error;
}
