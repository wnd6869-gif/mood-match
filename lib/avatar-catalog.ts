import type { AnimalId, AvatarExpressionId } from "@/lib/character/character-types";

export type AvatarFaceFamily = "round-muzzle" | "cat" | "pointed-muzzle";
export type AvatarBackgroundId = "minimal-cream" | "warm-cafe" | "green-park";
export type AvatarEffectId = "soft-hearts" | "tiny-stars" | "floating-leaves" | "music-notes" | "warm-sparkles";

export type AvatarCatalogItem = {
  animalId: AnimalId;
  outfitBaseId: string;
  baseAssetPath: string;
  faceFamily: AvatarFaceFamily;
  faceRigVersion: string;
  animalTraits: { warmth: number; calm: number; confidence: number; playfulness: number; chic: number; focus: number };
  visualAffinity: { warm: number; cool: number; clean: number; cozy: number; natural: number; urban: number; soft: number; polished: number; energetic: number };
  allowedExpressions: readonly AvatarExpressionId[];
  allowedBackgrounds: readonly AvatarBackgroundId[];
  allowedEffects: readonly AvatarEffectId[];
  glassesEligible: boolean;
};

const expressions = ["gentle", "bright", "chic", "confident", "playful"] as const;
const backgrounds = ["minimal-cream", "warm-cafe", "green-park"] as const;
const effects = ["soft-hearts", "tiny-stars", "floating-leaves", "music-notes", "warm-sparkles"] as const;

const traits = (warmth: number, calm: number, confidence: number, playfulness: number, chic: number, focus: number) => ({ warmth, calm, confidence, playfulness, chic, focus });
const affinity = (warm: number, cool: number, clean: number, cozy: number, natural: number, urban: number, soft: number, polished: number, energetic: number) => ({ warm, cool, clean, cozy, natural, urban, soft, polished, energetic });

/** The sole data source for user-visible fixed animal + outfit bases. */
export const AVATAR_CATALOG: readonly AvatarCatalogItem[] = [
  { animalId: "golden-retriever", outfitBaseId: "golden-retriever-cream-knit", baseAssetPath: "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-cream-knit-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(95, 65, 45, 45, 30, 35), visualAffinity: affinity(95, 10, 45, 95, 40, 20, 95, 35, 40), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "golden-retriever", outfitBaseId: "golden-retriever-coral-hoodie", baseAssetPath: "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-coral-hoodie-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(85, 35, 50, 80, 30, 35), visualAffinity: affinity(85, 15, 50, 60, 60, 45, 80, 35, 95), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "golden-retriever", outfitBaseId: "golden-retriever-navy-cardigan", baseAssetPath: "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-navy-cardigan-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(60, 65, 70, 25, 80, 70), visualAffinity: affinity(45, 55, 75, 45, 25, 75, 50, 95, 30), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "otter", outfitBaseId: "otter-sage-green-hoodie", baseAssetPath: "/character-assets/animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(85, 90, 45, 45, 30, 35), visualAffinity: affinity(75, 30, 55, 75, 85, 25, 75, 40, 35), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "brown-bear", outfitBaseId: "brown-bear-sage-green-hoodie", baseAssetPath: "/character-assets/animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(60, 80, 90, 30, 35, 55), visualAffinity: affinity(65, 25, 55, 65, 60, 35, 55, 55, 30), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "capybara", outfitBaseId: "capybara-sage-cardigan", baseAssetPath: "/character-assets/animals/capybara/sage-cardigan/capybara-sage-cardigan-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(85, 95, 40, 35, 25, 30), visualAffinity: affinity(75, 30, 50, 90, 70, 25, 80, 35, 25), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "welsh-corgi", outfitBaseId: "welsh-corgi-coral-hoodie", baseAssetPath: "/character-assets/animals/welsh-corgi/coral-hoodie/welsh-corgi-coral-hoodie-base.png", faceFamily: "round-muzzle", faceRigVersion: "round-muzzle-v1", animalTraits: traits(85, 35, 55, 95, 30, 40), visualAffinity: affinity(80, 15, 55, 60, 55, 45, 75, 40, 100), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "russian-blue", outfitBaseId: "russian-blue-navy-cardigan", baseAssetPath: "/character-assets/animals/russian-blue/navy-cardigan/russian-blue.navy-cardigan-base.v2.png", faceFamily: "cat", faceRigVersion: "cat-v1", animalTraits: traits(30, 75, 65, 25, 95, 90), visualAffinity: affinity(15, 95, 85, 30, 25, 80, 35, 95, 30), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "ragdoll", outfitBaseId: "ragdoll-dusty-lavender-cardigan", baseAssetPath: "/character-assets/animals/ragdoll/dusty-lavender-cardigan/ragdoll-dusty-lavender-cardigan-base.v2.png", faceFamily: "cat", faceRigVersion: "cat-v1", animalTraits: traits(90, 70, 40, 45, 55, 40), visualAffinity: affinity(75, 45, 55, 95, 35, 45, 100, 55, 35), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "scottish-fold", outfitBaseId: "scottish-fold-olive-knit", baseAssetPath: "/character-assets/animals/scottish-fold/olive-knit/scottish-fold-olive-knit-base.png", faceFamily: "cat", faceRigVersion: "cat-v1", animalTraits: traits(80, 60, 40, 85, 45, 35), visualAffinity: affinity(70, 35, 50, 85, 60, 35, 85, 45, 60), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "shiba-inu", outfitBaseId: "shiba-inu-olive-hoodie", baseAssetPath: "/character-assets/animals/shiba-inu/olive-hoodie/shiba-inu.olive-hoodie-base.v2.png", faceFamily: "pointed-muzzle", faceRigVersion: "pointed-muzzle-v1", animalTraits: traits(45, 50, 90, 45, 65, 60), visualAffinity: affinity(55, 40, 90, 40, 90, 45, 45, 65, 50), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "red-fox", outfitBaseId: "red-fox-olive-hoodie", baseAssetPath: "/character-assets/animals/red-fox/olive-hoodie/red-fox.olive-hoodie-base.png", faceFamily: "pointed-muzzle", faceRigVersion: "pointed-muzzle-v1", animalTraits: traits(45, 40, 85, 55, 100, 60), visualAffinity: affinity(55, 45, 75, 35, 75, 85, 40, 90, 55), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
  { animalId: "border-collie", outfitBaseId: "border-collie-charcoal-jacket", baseAssetPath: "/character-assets/animals/border-collie/charcoal-jacket/border-collie.charcoal-jacket-base.png", faceFamily: "pointed-muzzle", faceRigVersion: "pointed-muzzle-v1", animalTraits: traits(45, 55, 85, 40, 75, 100), visualAffinity: affinity(35, 55, 85, 35, 40, 80, 35, 100, 60), allowedExpressions: expressions, allowedBackgrounds: backgrounds, allowedEffects: effects, glassesEligible: true },
] as const;

export const AVATAR_CATALOG_BY_BASE = Object.freeze(Object.fromEntries(AVATAR_CATALOG.map((item) => [item.outfitBaseId, item])) as Record<string, AvatarCatalogItem>);
