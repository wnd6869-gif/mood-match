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
  "face-accessory",
  "foreground-effect",
] as const;

export type AnimalId =
  | "golden-retriever"
  | "russian-blue"
  | "otter"
  | "red-fox"
  | "white-rabbit"
  | "capybara"
  | "brown-bear"
  | "welsh-corgi"
  | "ragdoll"
  | "scottish-fold"
  | "shiba-inu"
  | "border-collie";
export type EyeStyleId =
  | "gentle" | "bright" | "chic" | "confident" | "playful"
  | "focused" | "cozy" | "curious" | "delicate";
export type EyebrowStyleId = EyeStyleId;
export type MouthStyleId =
  | "small-smile" | "warm-smile" | "big-smile"
  | "neutral" | "playful-smirk" | "shy-smile";
export type FaceEffectId =
  | "soft-blush" | "bright-blush" | "freckles" | "sparkle-cheeks";
export type OutfitId =
  | "cream-knit" | "coral-hoodie" | "navy-shirt"
  | "sage-cardigan" | "charcoal-jacket" | "lavender-sweater" | "olive-knit" | "olive-hoodie";
export type FaceAccessoryId = "round-glasses" | "thin-glasses" | "sunglasses";
export type BackgroundId =
  | "warm-cafe" | "cozy-room" | "green-park" | "evening-sky"
  | "quiet-library" | "minimal-coral" | "minimal-sage" | "minimal-lavender";
export type ForegroundEffectId =
  | "soft-hearts" | "tiny-stars" | "floating-leaves"
  | "music-notes" | "warm-sparkles";
export type PaletteId = "coral-cream" | "sage-cream" | "lavender-cream";

export type CharacterDisplayVariant =
  | "full"
  | "card"
  | "avatar"
  | "avatar-small";

export type CharacterDisplayTransform = {
  scale: number;
  x: number;
  y: number;
};

export type CharacterDisplayTransforms = Record<
  CharacterDisplayVariant,
  CharacterDisplayTransform
>;

export type AvatarExpressionId =
  | "gentle"
  | "bright"
  | "chic"
  | "confident"
  | "playful";

/**
 * The immutable recipe persisted with a generated persona.  The renderer
 * resolves it using the matching animal+outfit FaceRig preset, not by
 * recalculating facial coordinates on each screen.
 */
export type AvatarSelection = {
  animalId: AnimalId;
  outfitBaseId: string;
  faceRigVersion: string;
  expressionId: AvatarExpressionId;
  backgroundId: string;
  glassesId?: "round-glasses";
  effectId?: ForegroundEffectId;
};

export type CharacterComposition = {
  animal: AnimalId;
  eyes: EyeStyleId;
  eyebrows: EyebrowStyleId;
  mouth: MouthStyleId;
  faceEffect?: FaceEffectId;
  outfitBase: OutfitId;
  faceAccessory?: FaceAccessoryId;
  background: BackgroundId;
  foregroundEffect?: ForegroundEffectId;
  palette: PaletteId;
  avatarSelection?: AvatarSelection;
  seed: string;
  version: number;
};

export type CharacterAnchor = {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
};

export type FacePoint = { x: number; y: number };

export type FaceTransform = {
  x?: number; y?: number; scale?: number; rotation?: number;
};

export type ExpressionTransformOverride = {
  eyes?: FaceTransform;
  eyebrows?: FaceTransform;
  mouth?: FaceTransform;
};

export type FaceRig = {
  family: "round-muzzle";
  leftEye: FacePoint;
  rightEye: FacePoint;
  eyebrowCenter: FacePoint;
  mouthCenter: FacePoint;
  eyeScale: number;
  eyebrowScale: number;
  mouthScale: number;
  eyeRotation?: number;
  eyebrowRotation?: number;
  mouthRotation?: number;
  eyeColor: string;
  eyebrowColor: string;
  mouthColor: string;
  glasses?: FaceTransform;
  expressionTransformOverrides?: Partial<Record<"gentle" | "bright" | "chic" | "confident" | "playful", ExpressionTransformOverride>>;
};

export type AnimalAnchors = {
  leftEye: CharacterAnchor;
  rightEye: CharacterAnchor;
  eyebrows: CharacterAnchor;
  mouth: CharacterAnchor;
  faceAccessory: CharacterAnchor;
};
