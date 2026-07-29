import type { AvatarSelection } from "@/lib/character/character-types";

const ROOT = "/character-assets/foreground-effects/original";

export const AVATAR_FOREGROUND_EFFECTS: Record<NonNullable<AvatarSelection["effectId"]>, string> = {
  "soft-hearts": `${ROOT}/soft-hearts-v1.png`,
  "tiny-stars": `${ROOT}/tiny-stars-v1.png`,
  "floating-leaves": `${ROOT}/floating-leaves-v1.png`,
  "music-notes": `${ROOT}/music-notes-v1.png`,
  "warm-sparkles": `${ROOT}/warm-sparkles-v1.png`,
};
