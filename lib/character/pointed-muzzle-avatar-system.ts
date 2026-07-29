import shibaInuRig from "@/public/character-assets/avatar-system/pointed-muzzle/v1/face-rigs/shiba-inu.olive-hoodie.v1.json";
import redFoxRig from "@/public/character-assets/avatar-system/pointed-muzzle/v1/face-rigs/red-fox.olive-hoodie.v1.json";
import borderCollieRig from "@/public/character-assets/avatar-system/pointed-muzzle/v1/face-rigs/border-collie.charcoal-jacket.v1.json";
import type { AvatarSelection, CharacterComposition } from "@/lib/character/character-types";
import { AVATAR_FOREGROUND_EFFECTS } from "@/lib/avatar-effects";

const EXPRESSION_IDS = ["gentle", "bright", "chic", "confident", "playful"] as const;
type ExpressionId = (typeof EXPRESSION_IDS)[number];
type Point = { x: number; y: number };
type Layer = { offsetX: number; offsetY: number; scaleX: number; scaleY: number; rotation?: number };
type Delta = { deltaX?: number; deltaY?: number; scaleX?: number; scaleY?: number; rotation?: number };
type PointedRigOptions = { disabledLayers?: Array<keyof typeof PARTS> };

const POINTED_AVATARS = {
  "shiba-inu": {
    outfitBaseId: "shiba-inu-olive-hoodie",
    compositionOutfit: "olive-hoodie",
    base: "/character-assets/animals/shiba-inu/olive-hoodie/shiba-inu.olive-hoodie-base.v2.png",
    rig: shibaInuRig,
  },
  "red-fox": {
    outfitBaseId: "red-fox-olive-hoodie",
    compositionOutfit: "olive-hoodie",
    base: "/character-assets/animals/red-fox/olive-hoodie/red-fox.olive-hoodie-base.png",
    rig: redFoxRig,
  },
  "border-collie": {
    outfitBaseId: "border-collie-charcoal-jacket",
    compositionOutfit: "charcoal-jacket",
    base: "/character-assets/animals/border-collie/charcoal-jacket/border-collie.charcoal-jacket-base.png",
    rig: borderCollieRig,
  },
} as const;
type PointedAnimalId = keyof typeof POINTED_AVATARS;
type PointedRig = (typeof POINTED_AVATARS)[PointedAnimalId]["rig"];
const PARTS = {
  eyes: { width: 240, height: 90, center: { x: 120, y: 47 } },
  eyebrows: { width: 220, height: 50, center: { x: 110, y: 25 } },
  snoutMark: { width: 100, height: 72, center: { x: 50, y: 24 } },
} as const;
const GLASSES = { width: 280, height: 110, center: { x: 140, y: 55 } } as const;

function clone<T>(value: T): T { return structuredClone(value); }
function isPointedAnimalId(value: string): value is PointedAnimalId { return Object.hasOwn(POINTED_AVATARS, value); }
function resolveLayer(center: Point, layer: Layer, visualCenter: Point, override?: Delta) {
  const scaleX = layer.scaleX * (override?.scaleX ?? 1), scaleY = layer.scaleY * (override?.scaleY ?? 1);
  return { x: center.x + layer.offsetX + (override?.deltaX ?? 0) - visualCenter.x * scaleX, y: center.y + layer.offsetY + (override?.deltaY ?? 0) - visualCenter.y * scaleY, scaleX, scaleY, rotation: (layer.rotation ?? 0) + (override?.rotation ?? 0) };
}

export function isPointedMuzzleAvatarSelection(selection: AvatarSelection) {
  if (!isPointedAnimalId(selection.animalId)) return false;
  const avatar = POINTED_AVATARS[selection.animalId];
  return selection.outfitBaseId === avatar.outfitBaseId && selection.faceRigVersion === avatar.rig.version;
}
export function pointedMuzzleAvatarSelectionFromComposition(composition: CharacterComposition): AvatarSelection | undefined {
  if (!isPointedAnimalId(composition.animal)) return undefined;
  const avatar = POINTED_AVATARS[composition.animal];
  if (composition.outfitBase !== avatar.compositionOutfit) return undefined;
  return { animalId: composition.animal, outfitBaseId: avatar.outfitBaseId, faceRigVersion: avatar.rig.version, expressionId: EXPRESSION_IDS.includes(composition.eyes as ExpressionId) ? composition.eyes as ExpressionId : "gentle", backgroundId: composition.background === "green-park" ? "green-park" : composition.background === "warm-cafe" ? "warm-cafe" : "minimal-cream", glassesId: composition.faceAccessory === "round-glasses" ? "round-glasses" : undefined, effectId: composition.foregroundEffect === "warm-sparkles" ? "warm-sparkles" : undefined };
}
export function resolvePointedMuzzleFixedAvatarLayers(selection: AvatarSelection) {
  if (!isPointedMuzzleAvatarSelection(selection)) throw new Error("Pointed-muzzle AvatarSelection FaceRig preset is unavailable.");
  const avatar = POINTED_AVATARS[selection.animalId as PointedAnimalId], rig = clone(avatar.rig) as PointedRig, expression = selection.expressionId as ExpressionId;
  const overrides = clone(rig.expressionTransformOverrides?.[expression] ?? {}) as Partial<Record<keyof typeof PARTS, Delta>>;
  const centerFor = (part: keyof typeof PARTS) => part === "eyes" ? rig.anchors.eyeCenter : part === "eyebrows" ? rig.anchors.browCenter : rig.anchors.snoutMark;
  const disabledLayers = new Set((rig as PointedRig & PointedRigOptions).disabledLayers ?? []);
  const partLayers = (Object.keys(PARTS) as Array<keyof typeof PARTS>).filter((part) => !disabledLayers.has(part)).map((part) => {
    const spec = PARTS[part], placement = resolveLayer(centerFor(part), rig.layers[part], spec.center, overrides[part]), assetPart = part === "snoutMark" ? "snout-mark" : part;
    return { src: `/api/avatar-expression?family=pointed-muzzle&expression=${expression}&part=${assetPart}&color=${encodeURIComponent(rig.colors[part])}`, rigPlacement: { x: placement.x, y: placement.y, width: spec.width * placement.scaleX, height: spec.height * placement.scaleY, rotation: placement.rotation } };
  });
  const glasses = resolveLayer(rig.anchors.eyeCenter, rig.layers.glasses, GLASSES.center);
  const backgrounds: Record<string, string> = { "minimal-cream": "/character-assets/approval/golden-retriever-v2/mvp/png/backgrounds/minimal-cream.png", "green-park": "/character-assets/approval/golden-retriever-v2/mvp/png/backgrounds/green-park.png", "warm-cafe": "/character-assets/approval/golden-retriever-v2/mvp/png/backgrounds/warm-cafe.png" };
  return [{ src: backgrounds[selection.backgroundId] ?? backgrounds["minimal-cream"] }, { src: avatar.base }, ...partLayers, ...(selection.glassesId ? [{ src: rig.sourceAssets.roundGlasses, rigPlacement: { x: glasses.x, y: glasses.y, width: GLASSES.width * glasses.scaleX, height: GLASSES.height * glasses.scaleY, rotation: glasses.rotation } }] : []), ...(selection.effectId ? [{ src: AVATAR_FOREGROUND_EFFECTS[selection.effectId] }] : [])];
}
