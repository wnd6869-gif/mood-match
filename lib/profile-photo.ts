export const PROFILE_PHOTO_BUCKET = "profile-photos";
export const PROFILE_PHOTO_MAX_SIZE_BYTES = 8 * 1024 * 1024;
export const PROFILE_PHOTO_MAX_SIZE_LABEL = "8MB";
export const PROFILE_PHOTO_MAX_DIMENSION = 1600;

export const PROFILE_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PROFILE_PHOTO_FILE_NAMES = [
  "profile.webp",
  "profile.jpg",
  "profile.jpeg",
  "profile.png",
] as const;

export type ProfilePhotoMimeType =
  (typeof PROFILE_PHOTO_MIME_TYPES)[number];

export type ProcessedProfilePhoto = {
  blob: Blob;
  contentType: "image/webp";
};
