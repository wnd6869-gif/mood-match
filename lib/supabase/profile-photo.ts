import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_PHOTO_BUCKET,
  PROFILE_PHOTO_FILE_NAMES,
} from "@/lib/profile-photo";

const SIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60;

export async function createProfilePhotoSignedUrl(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: files, error: listError } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .list(userId, {
      limit: PROFILE_PHOTO_FILE_NAMES.length,
      search: "profile.",
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (listError || !files?.length) {
    return null;
  }

  const file = files.find((candidate) =>
    PROFILE_PHOTO_FILE_NAMES.includes(
      candidate.name as (typeof PROFILE_PHOTO_FILE_NAMES)[number],
    ),
  );

  if (!file) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUrl(
      `${userId}/${file.name}`,
      SIGNED_URL_EXPIRES_IN_SECONDS,
    );

  return error ? null : data.signedUrl;
}
