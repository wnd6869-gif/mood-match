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

function isMissingAvatarRecipeColumn(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703" ||
    /avatar_selection|character_composition|character_asset_version|character_recipe|avatar_system_version|avatar_updated_at/i.test(error.message ?? "");
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

  if (isMissingAvatarRecipeColumn(error)) {
    ({ error } = await supabase.from("personas").upsert(personaFields, {
      onConflict: "user_id",
    }));
  }

  return error;
}
