import type {
  AnimalId,
  AvatarSelection,
  CharacterComposition,
} from "@/lib/character/character-types";
import goldenRetrieverRig from "@/public/character-assets/avatar-system/round-muzzle/v1/face-rigs/golden-retriever.v1.json";
import otterRig from "@/public/character-assets/avatar-system/round-muzzle/v1/face-rigs/otter.v1.json";
import brownBearRig from "@/public/character-assets/avatar-system/round-muzzle/v1/face-rigs/brown-bear.v1.json";
import welshCorgiRig from "@/public/character-assets/avatar-system/round-muzzle/v1/face-rigs/welsh-corgi.v1.json";
import capybaraRig from "@/public/character-assets/avatar-system/round-muzzle/v1/face-rigs/capybara.v1.json";
import roundMuzzleFamilyDefaults from "@/public/character-assets/avatar-system/round-muzzle/v1/family-defaults.json";
import { catAvatarSelectionFromComposition, isCatAvatarSelection, resolveCatFixedAvatarLayers } from "@/lib/character/cat-avatar-system";
import { isPointedMuzzleAvatarSelection, pointedMuzzleAvatarSelectionFromComposition, resolvePointedMuzzleFixedAvatarLayers } from "@/lib/character/pointed-muzzle-avatar-system";
import { AVATAR_FOREGROUND_EFFECTS } from "@/lib/avatar-effects";

export const ROUND_MUZZLE_VERSION = "v1" as const;
export const ROUND_MUZZLE_EXPRESSIONS = ["gentle", "bright", "chic", "confident", "playful"] as const;
export type RoundMuzzleExpressionId = (typeof ROUND_MUZZLE_EXPRESSIONS)[number];

export type { AvatarSelection } from "@/lib/character/character-types";

export type FixedOutfitBaseId =
  | "golden-retriever-cream-knit"
  | "golden-retriever-coral-hoodie"
  | "golden-retriever-navy-cardigan"
  | "otter-sage-green-hoodie"
  | "brown-bear-sage-green-hoodie"
  | "welsh-corgi-coral-hoodie"
  | "capybara-sage-cardigan";
export type AvatarBackgroundId = "minimal-cream" | "green-park" | "warm-cafe";

export type AvatarTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

type FacePoint = { x: number; y: number };
type CenteredLayerTransform = {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation?: number;
};
type ExpressionLayerDelta = {
  deltaX?: number;
  deltaY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
};

export type AvatarFaceRigPreset = {
  version: `round-muzzle-${typeof ROUND_MUZZLE_VERSION}`;
  animalId: AnimalId;
  faceFamily: "round-muzzle";
  sourceAssets: {
    sharedExpressionFamily: "round-muzzle";
    expressionAssetVersion: typeof ROUND_MUZZLE_VERSION;
    roundGlasses?: string;
  };
  anchors: {
    noseCenter: { x: number; y: number };
    eyes?: AvatarTransform;
    eyebrows?: AvatarTransform;
    mouth?: AvatarTransform;
    glasses?: AvatarTransform;
    eyeCenter?: FacePoint;
    browCenter?: FacePoint;
    mouthCenter?: FacePoint;
  };
  coordinateSystem?: "legacy-top-left" | "face-centers-v1";
  layers?: {
    eyes: CenteredLayerTransform;
    eyebrows: CenteredLayerTransform;
    mouth: CenteredLayerTransform;
    glasses?: CenteredLayerTransform;
  };
  colors: { eyes: string; eyebrows: string; mouth: string };
  expressionTransformOverrides?: Partial<Record<RoundMuzzleExpressionId, Partial<Record<"eyes" | "eyebrows" | "mouth", Partial<AvatarTransform> | ExpressionLayerDelta>>>>;
  approvedAt: string | null;
  qaSnapshotId: string;
};

type FaceRigFamilyDefaults = Pick<AvatarFaceRigPreset, "version" | "faceFamily" | "anchors" | "colors" | "expressionTransformOverrides">;

export type ResolvedFaceRig = AvatarFaceRigPreset & {
  expressionId: RoundMuzzleExpressionId;
  anchors: AvatarFaceRigPreset["anchors"] & {
    eyes: AvatarTransform;
    eyebrows: AvatarTransform;
    mouth: AvatarTransform;
  };
};

export type ResolvedAvatarLayer = {
  src: string;
  rigPlacement?: { x: number; y: number; width: number; height: number; rotation?: number };
};

const ROOT = "/character-assets";
const MVP_ROOT = `${ROOT}/approval/golden-retriever-v2/mvp/png`;

export const AVATAR_BACKGROUNDS: Record<AvatarBackgroundId, string> = {
  "minimal-cream": `${MVP_ROOT}/backgrounds/minimal-cream.png`,
  "green-park": `${MVP_ROOT}/backgrounds/green-park.png`,
  "warm-cafe": `${MVP_ROOT}/backgrounds/warm-cafe.png`,
};
export const ROUND_GLASSES = `${MVP_ROOT}/accessories/round-glasses.png`;
export const WARM_SPARKLES = `${ROOT}/foreground-effects/original/warm-sparkles-v1.png`;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Creates fresh nested objects for every branch. Never merge into a family
// default or an animal preset: those are locked source data.
function deepMerge<T>(base: T, override: unknown): T {
  const output = deepClone(base) as Record<string, unknown>;
  if (!isRecord(override)) return output as T;

  for (const [key, value] of Object.entries(override)) {
    if (isRecord(value) && isRecord(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = deepClone(value);
    }
  }
  return output as T;
}

function loadFaceRigPreset(rawPreset: unknown): AvatarFaceRigPreset {
  // A renderer gets an immutable clone of the animal JSON. This keeps a local
  // adjustment from changing another animal's approved preset.
  return deepFreeze(structuredClone(rawPreset)) as AvatarFaceRigPreset;
}

const FACE_RIG_PRESET_LIST = [
  goldenRetrieverRig,
  otterRig,
  brownBearRig,
  welshCorgiRig,
  capybaraRig,
].map(loadFaceRigPreset);

const ROUND_MUZZLE_FAMILY_DEFAULTS = deepFreeze(
  deepClone(roundMuzzleFamilyDefaults),
) as FaceRigFamilyDefaults;

export const AVATAR_FACE_RIG_PRESETS = Object.freeze(Object.fromEntries(
  FACE_RIG_PRESET_LIST.map((preset) => [preset.animalId, preset]),
)) as Partial<Record<AnimalId, AvatarFaceRigPreset>>;

// Fixed bases are intentionally separate from face rigs: each animal's saved
// facial anchors can be reused by every approved outfit-base for that animal.
export const FIXED_OUTFIT_BASES: Record<FixedOutfitBaseId, string> = Object.freeze({
  "golden-retriever-cream-knit": `${MVP_ROOT}/fixed-bases/golden-retriever-cream-knit-base.png`,
  "golden-retriever-coral-hoodie": `${MVP_ROOT}/fixed-bases/golden-retriever-coral-hoodie-base.png`,
  "golden-retriever-navy-cardigan": `${MVP_ROOT}/fixed-bases/golden-retriever-navy-cardigan-base.png`,
  "otter-sage-green-hoodie": `${ROOT}/animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png`,
  "brown-bear-sage-green-hoodie": `${ROOT}/animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png`,
  "welsh-corgi-coral-hoodie": `${ROOT}/animals/welsh-corgi/coral-hoodie/welsh-corgi-coral-hoodie-base.png`,
  "capybara-sage-cardigan": `${ROOT}/animals/capybara/sage-cardigan/capybara-sage-cardigan-base.png`,
});
const OUTFIT_BASE_ANIMALS: Record<FixedOutfitBaseId, AnimalId> = Object.freeze({
  "golden-retriever-cream-knit": "golden-retriever",
  "golden-retriever-coral-hoodie": "golden-retriever",
  "golden-retriever-navy-cardigan": "golden-retriever",
  "otter-sage-green-hoodie": "otter",
  "brown-bear-sage-green-hoodie": "brown-bear",
  "welsh-corgi-coral-hoodie": "welsh-corgi",
  "capybara-sage-cardigan": "capybara",
});

const PART_SIZES = { eyes: { width: 224, height: 100 }, eyebrows: { width: 224, height: 60 }, mouth: { width: 128, height: 70 } } as const;
// Visual bounds are measured from the locked shared SVGs. Center-based rigs
// place these visible centers on animal face anchors, never by guessed canvas
// offsets. Glasses use the same rule against their locked 1024px asset.
const PART_VISUAL_CENTERS = {
  eyes: { x: 111.5, y: 49.5 },
  eyebrows: { x: 109.5, y: 24.5 },
  mouth: { x: 63.5, y: 29.5 },
  glasses: { x: 511.5, y: 413.5 },
} as const;

function applyRelativeTransform(base: AvatarTransform, override?: Partial<AvatarTransform>): AvatarTransform {
  return {
    x: base.x + (override?.x ?? 0),
    y: base.y + (override?.y ?? 0),
    scaleX: base.scaleX * (override?.scaleX ?? 1),
    scaleY: base.scaleY * (override?.scaleY ?? 1),
    rotation: base.rotation + (override?.rotation ?? 0),
  };
}

function isExpressionDelta(value: unknown): value is ExpressionLayerDelta {
  return isRecord(value) && ("deltaX" in value || "deltaY" in value);
}

function resolveCenteredTransform(
  center: FacePoint,
  layer: CenteredLayerTransform,
  visualCenter: FacePoint,
  override?: Partial<AvatarTransform> | ExpressionLayerDelta,
): AvatarTransform {
  const delta = isExpressionDelta(override) ? override : {};
  const legacy = isExpressionDelta(override) ? {} : (override ?? {});
  const scaleX = layer.scaleX * (delta.scaleX ?? legacy.scaleX ?? 1);
  const scaleY = layer.scaleY * (delta.scaleY ?? legacy.scaleY ?? 1);
  const rotation = (layer.rotation ?? 0) + (delta.rotation ?? legacy.rotation ?? 0);
  return {
    x: center.x + layer.offsetX + (delta.deltaX ?? 0) - visualCenter.x * scaleX,
    y: center.y + layer.offsetY + (delta.deltaY ?? 0) - visualCenter.y * scaleY,
    scaleX,
    scaleY,
    rotation,
  };
}

export function resolveFaceRig({
  animalId,
  outfitBaseId,
  expressionId,
  faceFamily = "round-muzzle",
}: {
  animalId: AnimalId;
  outfitBaseId: FixedOutfitBaseId;
  expressionId: RoundMuzzleExpressionId;
  faceFamily?: "round-muzzle";
}): ResolvedFaceRig {
  const preset = AVATAR_FACE_RIG_PRESETS[animalId];
  if (!preset) throw new Error("AvatarSelection FaceRig preset is unavailable.");
  if (OUTFIT_BASE_ANIMALS[outfitBaseId] !== animalId || preset.animalId !== animalId || preset.faceFamily !== faceFamily) {
    throw new Error("AvatarSelection animal and FaceRig family do not match.");
  }
  if (!(ROUND_MUZZLE_EXPRESSIONS as readonly string[]).includes(expressionId)) {
    throw new Error("AvatarSelection expression is unavailable.");
  }

  // Both arguments are cloned before merging. `resolvedBase` and the final
  // result therefore share no nested transform object with JSON source data.
  const resolvedBase = deepMerge(ROUND_MUZZLE_FAMILY_DEFAULTS, deepClone(preset)) as AvatarFaceRigPreset;
  const override = deepClone(preset.expressionTransformOverrides?.[expressionId] ?? {});
  const anchors = deepClone(resolvedBase.anchors) as ResolvedFaceRig["anchors"];
  if (preset.coordinateSystem === "face-centers-v1" && preset.layers && preset.anchors.eyeCenter && preset.anchors.browCenter && preset.anchors.mouthCenter) {
    anchors.eyes = resolveCenteredTransform(preset.anchors.eyeCenter, preset.layers.eyes, PART_VISUAL_CENTERS.eyes, override.eyes);
    anchors.eyebrows = resolveCenteredTransform(preset.anchors.browCenter, preset.layers.eyebrows, PART_VISUAL_CENTERS.eyebrows, override.eyebrows);
    anchors.mouth = resolveCenteredTransform(preset.anchors.mouthCenter, preset.layers.mouth, PART_VISUAL_CENTERS.mouth, override.mouth);
    if (preset.layers.glasses) {
      anchors.glasses = resolveCenteredTransform(preset.anchors.eyeCenter, preset.layers.glasses, PART_VISUAL_CENTERS.glasses);
    }
  } else {
    for (const part of ["eyes", "eyebrows", "mouth"] as const) {
      anchors[part] = applyRelativeTransform(resolvedBase.anchors[part]!, override[part] as Partial<AvatarTransform> | undefined);
    }
  }

  return deepFreeze({
    ...resolvedBase,
    expressionId,
    anchors,
  });
}

function expressionPath(
  expression: RoundMuzzleExpressionId,
  part: keyof typeof PART_SIZES,
  color: string,
) {
  const params = new URLSearchParams({ expression, part, color });
  return `/api/avatar-expression?${params.toString()}`;
}

export function resolveFixedAvatarLayers(selection: AvatarSelection): ResolvedAvatarLayer[] {
  if (isCatAvatarSelection(selection)) return resolveCatFixedAvatarLayers(selection);
  if (isPointedMuzzleAvatarSelection(selection)) return resolvePointedMuzzleFixedAvatarLayers(selection);
  const preset = AVATAR_FACE_RIG_PRESETS[selection.animalId];
  if (!preset || selection.faceRigVersion !== preset.version) throw new Error("AvatarSelection FaceRig preset is unavailable.");
  if (!Object.hasOwn(AVATAR_BACKGROUNDS, selection.backgroundId)) throw new Error("AvatarSelection background is unavailable.");
  const expressionId = selection.expressionId as RoundMuzzleExpressionId;
  const backgroundId = selection.backgroundId as AvatarBackgroundId;
  const resolvedRig = resolveFaceRig({
    animalId: selection.animalId,
    outfitBaseId: selection.outfitBaseId as FixedOutfitBaseId,
    expressionId,
  });
  const partLayer = (part: keyof typeof PART_SIZES): ResolvedAvatarLayer => {
    const resolved = resolvedRig.anchors[part];
    const dimensions = PART_SIZES[part];
    return {
      src: expressionPath(expressionId, part, resolvedRig.colors[part]),
      rigPlacement: {
        x: resolved.x,
        y: resolved.y,
        width: dimensions.width * resolved.scaleX,
        height: dimensions.height * resolved.scaleY,
        rotation: resolved.rotation,
      },
    };
  };
  return [
    { src: AVATAR_BACKGROUNDS[backgroundId] },
    { src: FIXED_OUTFIT_BASES[selection.outfitBaseId as FixedOutfitBaseId] },
    partLayer("eyes"), partLayer("eyebrows"), partLayer("mouth"),
    ...(selection.glassesId && resolvedRig.anchors.glasses ? [{ src: resolvedRig.sourceAssets.roundGlasses ?? ROUND_GLASSES, rigPlacement: { x: resolvedRig.anchors.glasses.x, y: resolvedRig.anchors.glasses.y, width: 1024 * resolvedRig.anchors.glasses.scaleX, height: 1024 * resolvedRig.anchors.glasses.scaleY, rotation: resolvedRig.anchors.glasses.rotation } }] : []),
    ...(selection.effectId ? [{ src: AVATAR_FOREGROUND_EFFECTS[selection.effectId] }] : []),
  ];
}

export function getFixedOutfitBaseId(animalId: AnimalId, outfit: CharacterComposition["outfitBase"]): FixedOutfitBaseId | undefined {
  if (animalId === "golden-retriever") return outfit === "coral-hoodie" ? "golden-retriever-coral-hoodie" : outfit === "navy-shirt" ? "golden-retriever-navy-cardigan" : "golden-retriever-cream-knit";
  if (animalId === "otter") return "otter-sage-green-hoodie";
  if (animalId === "brown-bear") return "brown-bear-sage-green-hoodie";
  if (animalId === "welsh-corgi") return "welsh-corgi-coral-hoodie";
  if (animalId === "capybara") return "capybara-sage-cardigan";
  return undefined;
}

export function expressionFromComposition(composition: CharacterComposition): RoundMuzzleExpressionId {
  const candidate = composition.eyes;
  return (ROUND_MUZZLE_EXPRESSIONS as readonly string[]).includes(candidate) ? candidate as RoundMuzzleExpressionId : "gentle";
}

export function avatarSelectionFromComposition(composition: CharacterComposition): AvatarSelection | undefined {
  if (composition.avatarSelection) {
    const stored = composition.avatarSelection;
    if (isCatAvatarSelection(stored)) return stored;
    if (isPointedMuzzleAvatarSelection(stored)) return stored;
    const preset = AVATAR_FACE_RIG_PRESETS[stored.animalId];
    if (preset && preset.animalId === stored.animalId && preset.version === stored.faceRigVersion) return stored;
  }
  const catSelection = catAvatarSelectionFromComposition(composition);
  if (catSelection) return catSelection;
  const pointedMuzzleSelection = pointedMuzzleAvatarSelectionFromComposition(composition);
  if (pointedMuzzleSelection) return pointedMuzzleSelection;
  const outfitBaseId = getFixedOutfitBaseId(composition.animal, composition.outfitBase);
  if (!outfitBaseId) return undefined;
  return {
    animalId: composition.animal,
    outfitBaseId,
    faceRigVersion: "round-muzzle-v1",
    expressionId: expressionFromComposition(composition),
    backgroundId: composition.background === "green-park" ? "green-park" : composition.background === "warm-cafe" ? "warm-cafe" : "minimal-cream",
    glassesId: composition.faceAccessory === "round-glasses" ? "round-glasses" : undefined,
    effectId: composition.foregroundEffect === "warm-sparkles" ? "warm-sparkles" : undefined,
  };
}
