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

export const PROFILE_PHOTO_FILE_NAME_BY_MIME_TYPE = {
  "image/jpeg": "profile.jpg",
  "image/png": "profile.png",
  "image/webp": "profile.webp",
} as const satisfies Record<
  ProfilePhotoMimeType,
  (typeof PROFILE_PHOTO_FILE_NAMES)[number]
>;

export type ProcessedProfilePhoto = {
  blob: Blob;
  contentType: ProfilePhotoMimeType;
  fileName: (typeof PROFILE_PHOTO_FILE_NAMES)[number];
};

export function detectProfilePhotoMimeType(
  bytes: Uint8Array,
): ProfilePhotoMimeType | null {
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  return null;
}
