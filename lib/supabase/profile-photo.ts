import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_PHOTO_BUCKET,
  PROFILE_PHOTO_FILE_NAMES,
} from "@/lib/profile-photo";

const SIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60;

type StoredProfilePhoto = {
  objectPath: string;
  contentType: string | null;
};

async function findStoredProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoredProfilePhoto | null> {
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

  return {
    objectPath: `${userId}/${file.name}`,
    contentType: file.metadata?.mimetype ?? null,
  };
}

/**
 * Issues a signed URL only for the authenticated owner's own upload flows.
 * Other members must use the photo-reveal route, which rechecks mutual consent
 * immediately before downloading the private object.
 */
export async function createOwnProfilePhotoSignedUrl(
  supabase: SupabaseClient,
  ownerUserId: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || user?.id !== ownerUserId) {
    return null;
  }

  const photo = await findStoredProfilePhoto(supabase, ownerUserId);

  if (!photo) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUrl(
      photo.objectPath,
      SIGNED_URL_EXPIRES_IN_SECONDS,
    );

  return error ? null : data.signedUrl;
}

export async function downloadProfilePhoto(
  supabase: SupabaseClient,
  userId: string,
) {
  const photo = await findStoredProfilePhoto(supabase, userId);

  if (!photo) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .download(photo.objectPath);

  if (error || !data) {
    return null;
  }

  return {
    blob: data,
    contentType: photo.contentType || data.type || "image/jpeg",
  };
}
