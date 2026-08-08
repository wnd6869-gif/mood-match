import type { AvatarSelection } from "@/lib/character/character-types";

const ROOT = "/character-assets/foreground-effects/web";

export const AVATAR_FOREGROUND_EFFECTS: Record<NonNullable<AvatarSelection["effectId"]>, string> = {
  "soft-hearts": `${ROOT}/soft-hearts-v1.webp`,
  "tiny-stars": `${ROOT}/tiny-stars-v1.webp`,
  "floating-leaves": `${ROOT}/floating-leaves-v1.webp`,
  "music-notes": `${ROOT}/music-notes-v1.webp`,
  "warm-sparkles": `${ROOT}/warm-sparkles-v1.webp`,
};
