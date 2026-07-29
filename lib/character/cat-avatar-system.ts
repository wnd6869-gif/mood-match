import ragdollRig from "@/public/character-assets/avatar-system/cat/v1/face-rigs/ragdoll.dusty-lavender-cardigan.v1.json";
import russianBlueRig from "@/public/character-assets/avatar-system/cat/v1/face-rigs/russian-blue.navy-cardigan.v1.json";
import scottishFoldRig from "@/public/character-assets/avatar-system/cat/v1/face-rigs/scottish-fold.olive-knit.v1.json";
import type { AvatarSelection, CharacterComposition } from "@/lib/character/character-types";
import { AVATAR_FOREGROUND_EFFECTS } from "@/lib/avatar-effects";

const EXPRESSION_IDS = ["gentle", "bright", "chic", "confident", "playful"] as const;
type ExpressionId = (typeof EXPRESSION_IDS)[number];
type Point = { x: number; y: number };
type Layer = { offsetX: number; offsetY: number; scaleX: number; scaleY: number; rotation?: number };
type Delta = { deltaX?: number; deltaY?: number; scaleX?: number; scaleY?: number; rotation?: number };

const CAT_AVATARS = {
  "russian-blue": {
    outfitBaseId: "russian-blue-navy-cardigan",
    compositionOutfit: "navy-shirt",
    base: "/character-assets/animals/russian-blue/navy-cardigan/russian-blue.navy-cardigan-base.v2.png",
    rig: russianBlueRig,
  },
  ragdoll: {
    outfitBaseId: "ragdoll-dusty-lavender-cardigan",
    compositionOutfit: "lavender-sweater",
    base: "/character-assets/animals/ragdoll/dusty-lavender-cardigan/ragdoll-dusty-lavender-cardigan-base.v2.png",
    rig: ragdollRig,
  },
  "scottish-fold": {
    outfitBaseId: "scottish-fold-olive-knit",
    compositionOutfit: "olive-knit",
    base: "/character-assets/animals/scottish-fold/olive-knit/scottish-fold-olive-knit-base.png",
    rig: scottishFoldRig,
  },
} as const;

type CatAnimalId = keyof typeof CAT_AVATARS;
type CatRig = (typeof CAT_AVATARS)[CatAnimalId]["rig"];
const PARTS = {
  eyes: { width: 240, height: 90, center: { x: 120, y: 47 } },
  eyebrows: { width: 220, height: 50, center: { x: 110, y: 25 } },
  noseMouth: { width: 140, height: 100, center: { x: 70, y: 29 } },
} as const;
const GLASSES = { width: 280, height: 110, center: { x: 140, y: 55 } } as const;

function clone<T>(value: T): T { return structuredClone(value); }
function isCatAnimalId(value: string): value is CatAnimalId { return Object.hasOwn(CAT_AVATARS, value); }
function resolveLayer(center: Point, layer: Layer, visualCenter: Point, override?: Delta) {
  const scaleX = layer.scaleX * (override?.scaleX ?? 1);
  const scaleY = layer.scaleY * (override?.scaleY ?? 1);
  return {
    x: center.x + layer.offsetX + (override?.deltaX ?? 0) - visualCenter.x * scaleX,
    y: center.y + layer.offsetY + (override?.deltaY ?? 0) - visualCenter.y * scaleY,
    scaleX,
    scaleY,
    rotation: (layer.rotation ?? 0) + (override?.rotation ?? 0),
  };
}

export function isCatAvatarSelection(selection: AvatarSelection) {
  if (!isCatAnimalId(selection.animalId)) return false;
  const avatar = CAT_AVATARS[selection.animalId];
  return selection.outfitBaseId === avatar.outfitBaseId && selection.faceRigVersion === avatar.rig.version;
}

export function catAvatarSelectionFromComposition(composition: CharacterComposition): AvatarSelection | undefined {
  if (!isCatAnimalId(composition.animal)) return undefined;
  const avatar = CAT_AVATARS[composition.animal];
  if (composition.outfitBase !== avatar.compositionOutfit) return undefined;
  return {
    animalId: composition.animal,
    outfitBaseId: avatar.outfitBaseId,
    faceRigVersion: avatar.rig.version,
    expressionId: EXPRESSION_IDS.includes(composition.eyes as ExpressionId) ? composition.eyes as ExpressionId : "gentle",
    backgroundId: composition.background === "green-park" ? "green-park" : composition.background === "warm-cafe" ? "warm-cafe" : "minimal-cream",
    glassesId: composition.faceAccessory === "round-glasses" ? "round-glasses" : undefined,
    effectId: composition.foregroundEffect === "warm-sparkles" ? "warm-sparkles" : undefined,
  };
}

export function resolveCatFixedAvatarLayers(selection: AvatarSelection) {
  if (!isCatAvatarSelection(selection)) throw new Error("Cat AvatarSelection FaceRig preset is unavailable.");
  if (!(EXPRESSION_IDS as readonly string[]).includes(selection.expressionId)) throw new Error("Cat expression is unavailable.");
  const avatar = CAT_AVATARS[selection.animalId as CatAnimalId];
  const rig = clone(avatar.rig) as CatRig;
  const expression = selection.expressionId as ExpressionId;
  const overrides = clone(rig.expressionTransformOverrides?.[expression] ?? {}) as Partial<Record<keyof typeof PARTS, Delta>>;
  const centerFor = (part: keyof typeof PARTS) => part === "eyes" ? rig.anchors.eyeCenter : part === "eyebrows" ? rig.anchors.browCenter : rig.anchors.noseCenter;
  const partLayers = (Object.keys(PARTS) as Array<keyof typeof PARTS>).map((part) => {
    const partSpec = PARTS[part];
    const placement = resolveLayer(centerFor(part), rig.layers[part], partSpec.center, overrides[part]);
    const assetPart = part === "noseMouth" ? "nose-mouth" : part;
    return {
      src: `/api/avatar-expression?family=cat&expression=${expression}&part=${assetPart}&color=${encodeURIComponent(rig.colors[part])}`,
      rigPlacement: { x: placement.x, y: placement.y, width: partSpec.width * placement.scaleX, height: partSpec.height * placement.scaleY, rotation: placement.rotation },
    };
  });
  const glasses = resolveLayer(rig.anchors.eyeCenter, rig.layers.glasses, GLASSES.center);
  const backgrounds: Record<string, string> = {
    "minimal-cream": "/character-assets/approval/golden-retriever-v2/mvp/png/backgrounds/minimal-cream.png",
    "green-park": "/character-assets/approval/golden-retriever-v2/mvp/png/backgrounds/green-park.png",
    "warm-cafe": "/character-assets/approval/golden-retriever-v2/mvp/png/backgrounds/warm-cafe.png",
  };
  return [
    { src: backgrounds[selection.backgroundId] ?? backgrounds["minimal-cream"] },
    { src: avatar.base },
    ...partLayers,
    ...(selection.glassesId ? [{ src: rig.sourceAssets.roundGlasses, rigPlacement: { x: glasses.x, y: glasses.y, width: GLASSES.width * glasses.scaleX, height: GLASSES.height * glasses.scaleY, rotation: glasses.rotation } }] : []),
    ...(selection.effectId ? [{ src: AVATAR_FOREGROUND_EFFECTS[selection.effectId] }] : []),
  ];
}
