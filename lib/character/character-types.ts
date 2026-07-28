export const CHARACTER_LAYER_ORDER = [
  "background",
  "background-decoration",
  "animal-base",
  "face-pattern",
  "eyes",
  "eyebrows",
  "mouth",
  "blush",
  "outfit",
  "head-accessory",
  "face-accessory",
  "neck-accessory",
  "hand-prop",
  "foreground-effect",
] as const;

export type AnimalId =
  | "golden-retriever"
  | "russian-blue"
  | "otter"
  | "red-fox"
  | "white-rabbit"
  | "capybara";
export type EyeStyleId =
  | "gentle" | "bright" | "chic" | "confident"
  | "focused" | "cozy" | "curious" | "delicate";
export type EyebrowStyleId = EyeStyleId;
export type MouthStyleId =
  | "small-smile" | "warm-smile" | "big-smile"
  | "neutral" | "playful-smirk" | "shy-smile";
export type FaceEffectId =
  | "soft-blush" | "bright-blush" | "freckles" | "sparkle-cheeks";
export type OutfitId =
  | "cream-knit" | "coral-hoodie" | "navy-shirt"
  | "sage-cardigan" | "charcoal-jacket" | "lavender-sweater";
export type HeadAccessoryId = "beret" | "beanie" | "hairpin";
export type FaceAccessoryId = "round-glasses" | "thin-glasses";
export type NeckAccessoryId = "headphones" | "bow-tie" | "scarf";
export type HandPropId =
  | "coffee" | "book" | "camera" | "smartphone" | "flower" | "music-player";
export type BackgroundId =
  | "warm-cafe" | "cozy-room" | "green-park" | "evening-sky"
  | "quiet-library" | "minimal-coral" | "minimal-sage" | "minimal-lavender";
export type ForegroundEffectId =
  | "soft-hearts" | "tiny-stars" | "floating-leaves"
  | "music-notes" | "warm-sparkles";
export type PaletteId = "coral-cream" | "sage-cream" | "lavender-cream";

export type CharacterComposition = {
  animal: AnimalId;
  eyes: EyeStyleId;
  eyebrows: EyebrowStyleId;
  mouth: MouthStyleId;
  faceEffect?: FaceEffectId;
  outfit: OutfitId;
  headAccessory?: HeadAccessoryId;
  faceAccessory?: FaceAccessoryId;
  neckAccessory?: NeckAccessoryId;
  handProp?: HandPropId;
  background: BackgroundId;
  foregroundEffect?: ForegroundEffectId;
  palette: PaletteId;
  seed: string;
  version: number;
};

export type CharacterAnchor = {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
};

export type AnimalAnchors = {
  leftEye: CharacterAnchor;
  rightEye: CharacterAnchor;
  eyebrows: CharacterAnchor;
  mouth: CharacterAnchor;
  headAccessory: CharacterAnchor;
  faceAccessory: CharacterAnchor;
  neckAccessory: CharacterAnchor;
  handProp: CharacterAnchor;
};
