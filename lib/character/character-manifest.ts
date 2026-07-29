import type {
  AnimalAnchors,
  CharacterDisplayTransforms,
  AnimalId,
  CharacterComposition,
  FaceRig,
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
  faceAccessory: { x: 512, y: 345, scale: 1 },
  ...overrides,
});

export const GOLDEN_RETRIEVER_FACE_RIG: FaceRig = {
  family: "round-muzzle",
  leftEye: { x: 436, y: 414 },
  rightEye: { x: 588, y: 414 },
  eyebrowCenter: { x: 512, y: 352 },
  mouthCenter: { x: 512, y: 548 },
  eyeScale: 1,
  eyebrowScale: 1,
  mouthScale: 1,
  eyeColor: "#32140c",
  eyebrowColor: "#793805",
  mouthColor: "#5b2615",
};

export const OTTER_FACE_RIG: FaceRig = {
  family: "round-muzzle",
  leftEye: { x: 446, y: 365 }, rightEye: { x: 578, y: 365 },
  eyebrowCenter: { x: 512, y: 338 }, mouthCenter: { x: 512, y: 500 },
  eyeScale: 0.98, eyebrowScale: 1.22, mouthScale: 1.18,
  eyeRotation: 0, eyebrowRotation: 0, mouthRotation: 0,
  eyeColor: "#2b1a13", eyebrowColor: "#3c2015", mouthColor: "#542a1d",
  expressionTransformOverrides: {
    gentle: { eyebrows: { y: -4, scale: 0.82 }, mouth: { y: 2, scale: 1.05 } },
    bright: { eyes: { y: -3, scale: 1.08 }, eyebrows: { y: -13, rotation: 3, scale: 0.85 }, mouth: { y: 0, scale: 1.22, rotation: 0 } },
    chic: { eyes: { scale: 0.92 }, eyebrows: { y: -7, rotation: 0, scale: 0.8 }, mouth: { y: 4, scale: 0.94 } },
    confident: { eyes: { y: -1, scale: 1.02 }, eyebrows: { y: -12, rotation: -4, scale: 0.84 }, mouth: { y: 3, scale: 1.12 } },
    playful: { eyes: { y: -2, scale: 1.08 }, eyebrows: { y: -18, rotation: 5, scale: 0.86 }, mouth: { x: 6, y: 1, rotation: -5, scale: 1.22 } },
  },
};

export const BROWN_BEAR_FACE_RIG: FaceRig = {
  // noseCenter: { x: 512, y: 376 }. Keep features compact around the short,
  // wide muzzle: eyes/brows stay in the brown forehead and mouth retains a
  // small cream-fur gap below the nose.
  family: "round-muzzle", leftEye:{x:452,y:278}, rightEye:{x:572,y:278}, eyebrowCenter:{x:512,y:228}, mouthCenter:{x:512,y:388}, eyeScale:0.96, eyebrowScale:0.84, mouthScale:0.96,
  eyeColor:"#2b1a13", eyebrowColor:"#3c2015", mouthColor:"#542a1d",
  // 1.2x of the previous .85 placement. Keep the lens midpoint centered on
  // the eyes, then lower it by 15px so the eyes sit inside each lens.
  glasses:{x:-10,y:-145,scale:1.02},
  expressionTransformOverrides: {
    gentle:{eyebrows:{y:-10,scale:1.08},mouth:{y:3,scale:1.08}},
    bright:{eyes:{y:-2,scale:1.07},eyebrows:{y:-14,scale:1.12,rotation:3},mouth:{y:2,scale:1.16}},
    chic:{eyebrows:{y:-8,scale:1.06},mouth:{y:5,scale:1.02}},
    confident:{eyebrows:{y:-12,scale:1.12,rotation:-3},mouth:{y:4,scale:1.12}},
    playful:{eyebrows:{y:-15,scale:1.14,rotation:5},mouth:{x:4,y:3,scale:1.16,rotation:-4}},
  },
};

export const ANIMAL_MANIFEST: Record<
  AnimalId,
  {
    label: string;
    base: string;
    anchors: AnimalAnchors;
    displayTransforms: CharacterDisplayTransforms;
    faceRig?: FaceRig;
    ready: true;
  }
> = {
  "golden-retriever": {
    label: "골든리트리버",
    base: `${ROOT}/animals/golden-retriever/web/base-v1.webp`,
    anchors: anchors(),
    displayTransforms: defaultDisplayTransforms(),
    faceRig: GOLDEN_RETRIEVER_FACE_RIG,
    ready: true,
  },
  "russian-blue": {
    label: "러시안블루",
    base: `${ROOT}/animals/russian-blue/web/base-v1.webp`,
    anchors: anchors({
      faceAccessory: { x: 512, y: 350, scale: 0.9 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  ragdoll: {
    label: "랙돌",
    base: `${ROOT}/animals/ragdoll/dusty-lavender-cardigan/ragdoll-dusty-lavender-cardigan-base.v2.png`,
    anchors: anchors({
      faceAccessory: { x: 512, y: 244, scale: 1.03 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "scottish-fold": {
    label: "스코티쉬폴드",
    base: `${ROOT}/animals/scottish-fold/olive-knit/scottish-fold-olive-knit-base.png`,
    anchors: anchors({
      faceAccessory: { x: 512, y: 322, scale: 1.03 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "shiba-inu": {
    label: "시바견",
    base: `${ROOT}/animals/shiba-inu/olive-hoodie/shiba-inu.olive-hoodie-base.v2.png`,
    anchors: anchors({ faceAccessory: { x: 512, y: 300, scale: 0.92 } }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  otter: {
    label: "수달",
    base: `${ROOT}/animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png`,
    anchors: anchors({ faceAccessory: { x: 512, y: 360, scale: 0.92 } }),
    displayTransforms: defaultDisplayTransforms(),
    faceRig: OTTER_FACE_RIG,
    ready: true,
  },
  "red-fox": {
    label: "붉은여우",
    base: `${ROOT}/animals/red-fox/olive-hoodie/red-fox.olive-hoodie-base.png`,
    anchors: anchors({
      faceAccessory: { x: 512, y: 350, scale: 0.92 },
    }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "border-collie": {
    label: "보더콜리",
    base: `${ROOT}/animals/border-collie/charcoal-jacket/border-collie.charcoal-jacket-base.png`,
    anchors: anchors({ faceAccessory: { x: 518, y: 259, scale: 0.78 } }),
    displayTransforms: defaultDisplayTransforms(),
    ready: true,
  },
  "white-rabbit": {
    label: "흰토끼",
    base: `${ROOT}/animals/white-rabbit/web/base-v1.webp`,
    anchors: anchors({
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
  "brown-bear": {
    label: "불곰",
    base: `${ROOT}/animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png`,
    anchors: anchors(),
    displayTransforms: defaultDisplayTransforms(),
    faceRig: BROWN_BEAR_FACE_RIG,
    ready: true,
  },
  "welsh-corgi": {
    label: "웰시코기",
    base: `${ROOT}/animals/welsh-corgi/coral-hoodie/welsh-corgi-coral-hoodie-base.png`,
    anchors: anchors({ faceAccessory: { x: 512, y: 350, scale: 0.9 } }),
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

export const GOLDEN_RETRIEVER_EXPRESSION_IDS = [
  "gentle",
  "bright",
  "chic",
  "confident",
  "playful",
] as const;

export type GoldenRetrieverExpressionId =
  (typeof GOLDEN_RETRIEVER_EXPRESSION_IDS)[number];

const GOLDEN_EXPRESSION_ROOT =
  `${ROOT}/approval/golden-retriever-v2/expressions/png`;

export const GOLDEN_RETRIEVER_EXPRESSION_ASSETS = Object.fromEntries(
  GOLDEN_RETRIEVER_EXPRESSION_IDS.map((expression) => [
    expression,
    {
      eyes: `${GOLDEN_EXPRESSION_ROOT}/eyes-${expression}.png`,
      eyebrows: `${GOLDEN_EXPRESSION_ROOT}/eyebrows-${expression}.png`,
      mouth: `${GOLDEN_EXPRESSION_ROOT}/mouth-${expression}.png`,
    },
  ]),
) as Record<
  GoldenRetrieverExpressionId,
  { eyes: string; eyebrows: string; mouth: string }
>;

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
  ["cream-knit", "coral-hoodie", "navy-shirt", "sage-cardigan", "charcoal-jacket", "lavender-sweater", "olive-knit", "olive-hoodie"] as const,
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

export const FACE_ACCESSORY_ASSETS = {
  "round-glasses": accessory("round-glasses"),
  "thin-glasses": accessory("thin-glasses"),
  sunglasses: accessory("sunglasses"),
} as const;

export const DEFAULT_COMPOSITION: CharacterComposition = {
  animal: "golden-retriever",
  eyes: "gentle",
  eyebrows: "gentle",
  mouth: "warm-smile",
  outfitBase: "cream-knit",
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
