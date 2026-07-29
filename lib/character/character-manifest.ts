import type {
  AnimalAnchors,
  CharacterDisplayTransforms,
  AnimalId,
  CharacterComposition,
} from "@/lib/character/character-types";

export const CHARACTER_ASSET_VERSION = 1;
const ROOT = "/character-assets";

const defaultDisplayTransforms = (): CharacterDisplayTransforms => ({
  full: { scale: 1, x: 0, y: 0 },
  card: { scale: 1.18, x: 0, y: 35 },
  avatar: { scale: 1.5, x: 0, y: 105 },
  "avatar-small": { scale: 1.9, x: 0, y: 140 },
});

const anchors = (
  overrides: Partial<AnimalAnchors> = {},
): AnimalAnchors => ({
  leftEye: { x: 420, y: 330 },
  rightEye: { x: 604, y: 330 },
  eyebrows: { x: 512, y: 285 },
  mouth: { x: 512, y: 485 },
  headAccessory: { x: 512, y: 180, scale: 1 },
  faceAccessory: { x: 512, y: 345, scale: 1 },
  neckAccessory: { x: 512, y: 640, scale: 1 },
  handProp: { x: 680, y: 750, scale: 1 },
  ...overrides,
});

export const ANIMAL_MANIFEST: Record<
  AnimalId,
  {
    label: string;
    base: string;
    anchors: AnimalAnchors;
    displayTransforms: CharacterDisplayTransforms;
    ready: true;
  }
> = {
  "golden-retriever": {
    label: "골든리트리버",
    base: `${ROOT}/animals/golden-retriever/web/base-v1.webp`,
    anchors: anchors(),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "russian-blue": {
    label: "러시안블루",
    base: `${ROOT}/animals/russian-blue/web/base-v1.webp`,
    anchors: anchors({
      headAccessory: { x: 512, y: 160, scale: 0.86 },
      faceAccessory: { x: 512, y: 350, scale: 0.9 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  otter: {
    label: "수달",
    base: `${ROOT}/animals/otter/web/base-v1.webp`,
    anchors: anchors({ faceAccessory: { x: 512, y: 360, scale: 0.92 } }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "red-fox": {
    label: "붉은여우",
    base: `${ROOT}/animals/red-fox/web/base-v1.webp`,
    anchors: anchors({
      headAccessory: { x: 512, y: 175, scale: 0.88 },
      faceAccessory: { x: 512, y: 350, scale: 0.92 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "white-rabbit": {
    label: "흰토끼",
    base: `${ROOT}/animals/white-rabbit/web/base-v1.webp`,
    anchors: anchors({
      headAccessory: { x: 512, y: 250, scale: 0.72 },
      faceAccessory: { x: 512, y: 390, scale: 0.86 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  capybara: {
    label: "카피바라",
    base: `${ROOT}/animals/capybara/web/base-v1.webp`,
    anchors: anchors({ faceAccessory: { x: 512, y: 345, scale: 0.96 } }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
};

export const APPROVED_GOLDEN_RETRIEVER_LAYERS = [
  `${ROOT}/approval/golden-retriever-v2/b-animal-base.png`,
  `${ROOT}/approval/golden-retriever-v2/eyes-default.png`,
  `${ROOT}/approval/golden-retriever-v2/eyebrows-default.png`,
  `${ROOT}/approval/golden-retriever-v2/mouth-default.png`,
] as const;

export const EYE_ASSETS = Object.fromEntries(
  ["gentle", "bright", "chic", "confident", "focused", "cozy", "curious", "delicate"]
    .map((id) => [id, `${ROOT}/expressions/eyes/web/${id}-v1.webp`]),
) as Record<CharacterComposition["eyes"], string>;

export const MOUTH_ASSETS = Object.fromEntries(
  ["small-smile", "warm-smile", "big-smile", "neutral", "playful-smirk", "shy-smile"]
    .map((id) => [id, `${ROOT}/expressions/mouths/web/${id}-v1.webp`]),
) as Record<CharacterComposition["mouth"], string>;

const webAssets = <T extends string>(folder: string, ids: readonly T[]) =>
  Object.fromEntries(
    ids.map((id) => [id, `${ROOT}/${folder}/web/${id}-v1.webp`]),
  ) as Record<T, string>;

export const FACE_EFFECT_ASSETS = webAssets(
  "expressions/face-effects",
  ["soft-blush", "bright-blush", "freckles", "sparkle-cheeks"] as const,
);
export const OUTFIT_ASSETS = webAssets(
  "outfits",
  ["cream-knit", "coral-hoodie", "navy-shirt", "sage-cardigan", "charcoal-jacket", "lavender-sweater"] as const,
);
export const PROP_ASSETS = webAssets(
  "props",
  ["coffee", "book", "camera", "smartphone", "flower", "music-player"] as const,
);
export const BACKGROUND_ASSETS = webAssets(
  "backgrounds",
  ["warm-cafe", "cozy-room", "green-park", "evening-sky", "quiet-library", "minimal-coral", "minimal-sage", "minimal-lavender"] as const,
);
export const FOREGROUND_ASSETS = webAssets(
  "foreground-effects",
  ["soft-hearts", "tiny-stars", "floating-leaves", "music-notes", "warm-sparkles"] as const,
);

const accessory = (id: string) =>
  `${ROOT}/accessories/all/web/${id}-v1.webp`;

export const ACCESSORY_ASSETS = {
  "round-glasses": accessory("round-glasses"),
  "thin-glasses": accessory("thin-glasses"),
  headphones: accessory("headphones"),
  beret: accessory("beret"),
  beanie: accessory("beanie"),
  hairpin: accessory("hairpin"),
  "bow-tie": accessory("bow-tie"),
  scarf: accessory("scarf"),
} as const;

export const DEFAULT_COMPOSITION: CharacterComposition = {
  animal: "golden-retriever",
  eyes: "gentle",
  eyebrows: "gentle",
  mouth: "warm-smile",
  outfit: "cream-knit",
  background: "minimal-coral",
  palette: "coral-cream",
  seed: "mood-match-default",
  version: CHARACTER_ASSET_VERSION,
};

export const FUTURE_ANIMALS = [
  "welsh-corgi", "shiba-inu", "border-collie", "ragdoll", "siamese-cat",
  "brown-bear", "deer", "raccoon", "meerkat", "penguin", "owl", "alpaca",
] as const;

export const ANIMAL_LAYER_TRANSFORMS: Partial<
  Record<AnimalId, { eyes?: string; mouth?: string; accessories?: string }>
> = {
  "russian-blue": { mouth: "translateY(5.5%)" },
  "white-rabbit": {
    eyes: "translateY(3%) scale(0.9)",
    accessories: "translateY(3%) scale(0.86)",
  },
  capybara: { mouth: "translateY(3%)" },
};
