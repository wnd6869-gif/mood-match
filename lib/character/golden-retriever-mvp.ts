import {
  GOLDEN_RETRIEVER_FACE_RIG,
  GOLDEN_RETRIEVER_EXPRESSION_ASSETS,
  type GoldenRetrieverExpressionId,
} from "@/lib/character/character-manifest";

const ROOT = "/character-assets/approval/golden-retriever-v2";
const MVP_ROOT = `${ROOT}/mvp/png`;
const ROUND_MUZZLE_ROOT = "/character-assets/expressions/round-muzzle";

export const GOLDEN_MVP_OUTFITS = [
  "cream-knit-sweater",
  "navy-shirt",
  "coral-hoodie",
] as const;
export const GOLDEN_MVP_FACE_ACCESSORIES = ["round-glasses"] as const;
/** Retained for audit only; no longer selectable in user-facing compositions. */
export const DEPRECATED_GOLDEN_MVP_HAND_PROPS = ["coffee", "book"] as const;
export const GOLDEN_MVP_BACKGROUNDS = [
  "minimal-cream",
  "warm-cafe",
  "green-park",
] as const;

export type GoldenMvpOutfit = (typeof GOLDEN_MVP_OUTFITS)[number];
export type GoldenMvpFaceAccessory =
  (typeof GOLDEN_MVP_FACE_ACCESSORIES)[number];
export type DeprecatedGoldenMvpHandProp =
  (typeof DEPRECATED_GOLDEN_MVP_HAND_PROPS)[number];
export type GoldenMvpBackground = (typeof GOLDEN_MVP_BACKGROUNDS)[number];
export type GoldenFixedBaseId =
  | "golden-retriever-cream-knit"
  | "golden-retriever-coral-hoodie"
  | "golden-retriever-navy-cardigan";

export type GoldenMvpSelection = {
  expression: GoldenRetrieverExpressionId;
  outfit: GoldenMvpOutfit;
  background: GoldenMvpBackground;
  faceAccessory?: GoldenMvpFaceAccessory;
};

export const GOLDEN_MVP_ASSETS = {
  body: {
    headBase: `${MVP_ROOT}/body/head-base.png`,
    bodySilhouetteBehindOutfit: `${MVP_ROOT}/body/body-silhouette-behind-outfit.png`,
    frontPawLeft: `${MVP_ROOT}/body/front-paw-left.png`,
    frontPawRight: `${MVP_ROOT}/body/front-paw-right.png`,
  },
  outfitBodies: {
    "cream-knit-sweater": `${MVP_ROOT}/outfit-body/cream-knit-sweater.png`,
  },
  fixedBases: {
    "golden-retriever-cream-knit": `${MVP_ROOT}/fixed-bases/golden-retriever-cream-knit-base.png`,
    "golden-retriever-coral-hoodie": `${MVP_ROOT}/fixed-bases/golden-retriever-coral-hoodie-base.png`,
    "golden-retriever-navy-cardigan": `${MVP_ROOT}/fixed-bases/golden-retriever-navy-cardigan-base.png`,
  },
  outfits: Object.fromEntries(
    GOLDEN_MVP_OUTFITS.map((id) => [id, `${MVP_ROOT}/outfits/${id}.png`]),
  ) as Record<GoldenMvpOutfit, string>,
  backgrounds: Object.fromEntries(
    GOLDEN_MVP_BACKGROUNDS.map((id) => [id, `${MVP_ROOT}/backgrounds/${id}.png`]),
  ) as Record<GoldenMvpBackground, string>,
  faceAccessories: {
    "round-glasses": `${MVP_ROOT}/accessories/round-glasses.png`,
  } as Record<GoldenMvpFaceAccessory, string>,
  /** Retained for audit only; never expose in a new selection. */
  deprecatedHeadAccessories: {
    beret: `${MVP_ROOT}/accessories/beret.png`,
  },
  /** Retained for audit only; never use for a new composition. */
  deprecatedHandProps: {
    coffee: {
      behindPaw: `${MVP_ROOT}/props/coffee-behind-paw.png`,
      frontPaws: [`${MVP_ROOT}/props/paw-front-coffee.png`],
    },
    book: {
      behindPaw: `${MVP_ROOT}/props/book-behind-paw.png`,
      frontPaws: [
        `${MVP_ROOT}/props/paw-front-left-book.png`,
        `${MVP_ROOT}/props/paw-front-right-book.png`,
      ],
    },
  } as Record<DeprecatedGoldenMvpHandProp, { behindPaw: string; frontPaws: string[] }>,
};

export const GOLDEN_MVP_COMBINATION_RULES = {
  maxOutfits: 1,
  maxFaceAccessories: 1,
  maxBackgrounds: 1,
  handProps: "deprecated-and-never-selectable",
  neckAccessories: "deprecated-and-never-selectable",
  headAccessories: "deprecated-and-never-selectable",
  roundGlassesCompatibleWithExpressions: true,
  contrastAdvisory: {
    "cream-knit-sweater": ["minimal-cream"],
    "coral-hoodie": [],
    "navy-shirt": [],
  },
} as const;

export function resolveGoldenMvpLayers(selection: GoldenMvpSelection): string[] {
  const expression = GOLDEN_RETRIEVER_EXPRESSION_ASSETS[selection.expression];
  const layers = [
    GOLDEN_MVP_ASSETS.backgrounds[selection.background],
    GOLDEN_MVP_ASSETS.body.bodySilhouetteBehindOutfit,
    GOLDEN_MVP_ASSETS.outfits[selection.outfit],
    GOLDEN_MVP_ASSETS.body.headBase,
    expression.eyes,
    expression.eyebrows,
    expression.mouth,
    selection.faceAccessory
      ? GOLDEN_MVP_ASSETS.faceAccessories[selection.faceAccessory]
      : undefined,
    GOLDEN_MVP_ASSETS.body.frontPawLeft,
    GOLDEN_MVP_ASSETS.body.frontPawRight,
  ];

  return layers.filter((layer): layer is string => Boolean(layer));
}

/**
 * The cream-knit proof uses one baked outfit-body asset. Its fur silhouette,
 * sleeves and paws must never be split apart again at runtime.
 */
export type GoldenCreamKnitRenderLayer = {
  src: string;
  transform?: string;
  rigPlacement?: { x: number; y: number; width: number; height: number; rotation?: number };
};

// The supplied fixed base is 1254px. The approved 1024px face canvas is
// normalized to it and lifted to preserve the intended eye/mouth anchors.
export const GOLDEN_CREAM_KNIT_FACE_TRANSFORM = "translateY(-8.61%)";

const roundMuzzleLayer = (expression: GoldenRetrieverExpressionId, part: "eyes" | "eyebrows" | "mouth"): GoldenCreamKnitRenderLayer => {
  const rig = GOLDEN_RETRIEVER_FACE_RIG;
  if (part === "eyes") return { src: `${ROUND_MUZZLE_ROOT}/${expression}/eyes.svg`, rigPlacement: { x: 400, y: 364, width: 224 * rig.eyeScale, height: 100 * rig.eyeScale, rotation: rig.eyeRotation } };
  if (part === "eyebrows") return { src: `${ROUND_MUZZLE_ROOT}/${expression}/eyebrows.svg`, rigPlacement: { x: 400, y: 330, width: 224 * rig.eyebrowScale, height: 60 * rig.eyebrowScale, rotation: rig.eyebrowRotation } };
  return { src: `${ROUND_MUZZLE_ROOT}/${expression}/mouth.svg`, rigPlacement: { x: 448, y: 515, width: 128 * rig.mouthScale, height: 70 * rig.mouthScale, rotation: rig.mouthRotation } };
};

export function resolveGoldenCreamKnitLayers(
  expression: GoldenRetrieverExpressionId = "gentle",
  options: {
    roundGlasses?: boolean;
  } = {},
): GoldenCreamKnitRenderLayer[] {
  return resolveGoldenFixedBaseLayers("golden-retriever-cream-knit", expression, options);
}

/**
 * Fixed outfit bases are complete, single-character illustrations. Only the
 * approved face, face-accessory, background, and foreground layers may be
 * composed over them; body parts are never recombined at runtime.
 */
export function resolveGoldenFixedBaseLayers(
  baseId: GoldenFixedBaseId,
  expression: GoldenRetrieverExpressionId = "gentle",
  options: {
    background?: GoldenMvpBackground;
    roundGlasses?: boolean;
    foregroundEffect?: string;
    expressionRenderer?: "svg" | "legacy-png";
  } = {},
): GoldenCreamKnitRenderLayer[] {
  const face = GOLDEN_RETRIEVER_EXPRESSION_ASSETS[expression];
  const useSvg = options.expressionRenderer !== "legacy-png";
  return [
    { src: GOLDEN_MVP_ASSETS.backgrounds[options.background ?? "minimal-cream"] },
    { src: GOLDEN_MVP_ASSETS.fixedBases[baseId] },
    ...(useSvg ? [roundMuzzleLayer(expression, "eyes"), roundMuzzleLayer(expression, "eyebrows"), roundMuzzleLayer(expression, "mouth")] : [
      { src: face.eyes, transform: GOLDEN_CREAM_KNIT_FACE_TRANSFORM },
      { src: face.eyebrows, transform: GOLDEN_CREAM_KNIT_FACE_TRANSFORM },
      { src: face.mouth, transform: GOLDEN_CREAM_KNIT_FACE_TRANSFORM },
    ]),
    ...(options.roundGlasses
      ? [{ src: GOLDEN_MVP_ASSETS.faceAccessories["round-glasses"], transform: GOLDEN_CREAM_KNIT_FACE_TRANSFORM }]
      : []),
    ...(options.foregroundEffect ? [{ src: options.foregroundEffect }] : []),
  ];
}
