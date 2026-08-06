import type { AvatarSelection, CharacterComposition } from "@/lib/character/character-types";
import {
  AVATAR_ANIMAL_LABELS,
  AVATAR_CATALOG,
  normalizeSupportedPersonaAnimalName,
  type AvatarBackgroundId,
  type AvatarCatalogItem,
  type AvatarEffectId,
} from "@/lib/avatar-catalog";

export type CastingExpression = "soft" | "smiling" | "neutral" | "focused" | "playful";
export type PhotoCastingSignals = {
  warmth: number; energy: number; polish: number; softness: number; confidence: number; playfulness: number;
  expression: CastingExpression; palette: "warm" | "cool" | "neutral"; settingMood: "clean" | "cozy" | "natural" | "urban";
  wearsGlasses: boolean; confidenceScore: number;
};
export type CharacterRecipe = {
  systemVersion: "avatar-v1"; animalId: AvatarSelection["animalId"]; outfitBaseId: string; faceFamily: string; faceRigVersion: string;
  expressionId: AvatarSelection["expressionId"]; backgroundId: AvatarBackgroundId; glassesId?: "round-glasses"; effectId?: AvatarEffectId;
  castingSeed: string; signals: PhotoCastingSignals; rationale: string;
};

const numberKeys = ["warmth", "energy", "polish", "softness", "confidence", "playfulness", "confidenceScore"] as const;
const expressionValues = ["soft", "smiling", "neutral", "focused", "playful"] as const;
const paletteValues = ["warm", "cool", "neutral"] as const;
const moodValues = ["clean", "cozy", "natural", "urban"] as const;
const clamp = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : fallback;

/** Server-safe runtime validation for the small, non-sensitive casting schema. */
export function parsePhotoCastingSignals(value: unknown): PhotoCastingSignals {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults: PhotoCastingSignals = { warmth: 50, energy: 50, polish: 50, softness: 50, confidence: 50, playfulness: 35, expression: "neutral", palette: "neutral", settingMood: "clean", wearsGlasses: false, confidenceScore: 50 };
  const parsed = { ...defaults };
  for (const key of numberKeys) parsed[key] = clamp(source[key], defaults[key]);
  if (expressionValues.includes(source.expression as CastingExpression)) parsed.expression = source.expression as CastingExpression;
  if (paletteValues.includes(source.palette as PhotoCastingSignals["palette"])) parsed.palette = source.palette as PhotoCastingSignals["palette"];
  if (moodValues.includes(source.settingMood as PhotoCastingSignals["settingMood"])) parsed.settingMood = source.settingMood as PhotoCastingSignals["settingMood"];
  parsed.wearsGlasses = source.wearsGlasses === true;
  return parsed;
}

function seeded(seed: string, salt: string) {
  let value = 2166136261;
  for (const char of `${seed}:${salt}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value >>> 0) / 4294967296;
}
function score(item: AvatarCatalogItem, signals: PhotoCastingSignals) {
  const t = item.animalTraits, v = item.visualAffinity;
  const visual = (signals.warmth * v.warm + (100 - signals.warmth) * v.cool + signals.polish * v.polished + signals.softness * v.soft + signals.energy * v.energetic) / 500;
  const character = (signals.warmth * t.warmth + (100 - signals.energy) * t.calm + signals.confidence * t.confidence + signals.playfulness * t.playfulness + signals.polish * t.chic) / 500;
  const setting = signals.settingMood === "natural" ? v.natural : signals.settingMood === "urban" ? v.urban : signals.settingMood === "cozy" ? v.cozy : v.clean;
  return visual * 0.55 + character * 0.35 + setting * 0.1;
}
function expressionFor(signals: PhotoCastingSignals): AvatarSelection["expressionId"] {
  if (signals.expression === "playful" && signals.playfulness >= 58 && signals.confidenceScore >= 60) return "playful";
  if (signals.expression === "smiling" || signals.energy >= 72) return "bright";
  if (signals.expression === "focused" && signals.confidence >= 58) return "confident";
  if (signals.expression === "neutral" && (signals.polish >= 58 || signals.palette === "cool")) return "chic";
  return "gentle";
}
function backgroundFor(signals: PhotoCastingSignals, expression: AvatarSelection["expressionId"]): AvatarBackgroundId {
  if (signals.settingMood === "natural" || signals.energy >= 75) return "green-park";
  if (["urban", "cozy"].includes(signals.settingMood) || expression === "chic" || expression === "confident") return "warm-cafe";
  return "minimal-cream";
}
function effectFor(signals: PhotoCastingSignals, seed: string): AvatarEffectId | undefined {
  if (seeded(seed, "effect") > 0.43) return undefined;
  if (signals.warmth >= 74 && signals.softness >= 70 && signals.expression === "smiling") return "soft-hearts";
  if (signals.polish >= 78) return "tiny-stars";
  if (signals.settingMood === "natural") return "floating-leaves";
  if (signals.playfulness >= 75) return "music-notes";
  if (signals.energy >= 75) return "warm-sparkles";
  return undefined;
}

export function castCharacter(
  signalsInput: unknown,
  castingSeed: string,
  preferredAnimalName?: string,
): CharacterRecipe {
  const signals = parsePhotoCastingSignals(signalsInput);
  const normalizedAnimalName = preferredAnimalName
    ? normalizeSupportedPersonaAnimalName(preferredAnimalName)
    : null;
  const eligibleCatalog = normalizedAnimalName
    ? AVATAR_CATALOG.filter(
        (item) => AVATAR_ANIMAL_LABELS[item.animalId] === normalizedAnimalName,
      )
    : AVATAR_CATALOG;
  const ranked = eligibleCatalog
    .map((item) => ({ item, score: score(item, signals) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const close = ranked.filter((candidate) => top.score - candidate.score < 4.5).slice(0, 4);
  const selected = close.length > 1 ? close[Math.floor(seeded(castingSeed, "animal") * close.length)] : top;
  const expressionId = expressionFor(signals);
  const backgroundId = backgroundFor(signals, expressionId);
  const glassesId = selected.item.glassesEligible && (signals.wearsGlasses || (expressionId === "chic" && signals.polish >= 86 && seeded(castingSeed, "glasses") < 0.16)) ? "round-glasses" : undefined;
  const effectId = effectFor(signals, castingSeed);
  const labels = [signals.palette === "warm" ? "따뜻한 톤" : signals.palette === "cool" ? "차분한 톤" : "균형 잡힌 톤", signals.expression === "smiling" ? "밝은 표정" : signals.expression === "focused" ? "또렷한 시선" : signals.settingMood === "natural" ? "자연스러운 무드" : "편안한 무드"];
  return { systemVersion: "avatar-v1", animalId: selected.item.animalId, outfitBaseId: selected.item.outfitBaseId, faceFamily: selected.item.faceFamily, faceRigVersion: selected.item.faceRigVersion, expressionId, backgroundId, glassesId, effectId, castingSeed, signals, rationale: `사진에서 보이는 ${labels.join("과 ")}을 캐릭터 연출에 담았어요.` };
}

export function recipeToAvatarSelection(recipe: CharacterRecipe): AvatarSelection {
  return { animalId: recipe.animalId, outfitBaseId: recipe.outfitBaseId, faceRigVersion: recipe.faceRigVersion, expressionId: recipe.expressionId, backgroundId: recipe.backgroundId, glassesId: recipe.glassesId, effectId: recipe.effectId };
}
export function recipeToComposition(recipe: CharacterRecipe): CharacterComposition {
  const outfitMap: Record<string, CharacterComposition["outfitBase"]> = { "golden-retriever-cream-knit": "cream-knit", "golden-retriever-coral-hoodie": "coral-hoodie", "golden-retriever-navy-cardigan": "navy-shirt", "otter-sage-green-hoodie": "sage-cardigan", "brown-bear-sage-green-hoodie": "sage-cardigan", "capybara-sage-cardigan": "sage-cardigan", "welsh-corgi-coral-hoodie": "coral-hoodie", "russian-blue-navy-cardigan": "navy-shirt", "ragdoll-dusty-lavender-cardigan": "lavender-sweater", "scottish-fold-olive-knit": "olive-knit", "shiba-inu-olive-hoodie": "olive-hoodie", "red-fox-olive-hoodie": "olive-hoodie", "border-collie-charcoal-jacket": "charcoal-jacket" };
  return { animal: recipe.animalId, eyes: recipe.expressionId, eyebrows: recipe.expressionId, mouth: recipe.expressionId === "bright" ? "warm-smile" : recipe.expressionId === "playful" ? "playful-smirk" : recipe.expressionId === "chic" ? "neutral" : "small-smile", outfitBase: outfitMap[recipe.outfitBaseId], faceAccessory: recipe.glassesId, background: recipe.backgroundId === "minimal-cream" ? "minimal-coral" : recipe.backgroundId, foregroundEffect: recipe.effectId, palette: recipe.backgroundId === "green-park" ? "sage-cream" : recipe.backgroundId === "warm-cafe" ? "lavender-cream" : "coral-cream", seed: recipe.castingSeed, version: 1, avatarSelection: recipeToAvatarSelection(recipe) };
}
