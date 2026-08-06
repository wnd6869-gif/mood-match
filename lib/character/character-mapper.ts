import type { PersonaAnalysisResult } from "@/lib/persona-analysis";
import {
  AVATAR_ANIMAL_LABELS,
  AVATAR_CATALOG,
  normalizeSupportedPersonaAnimalName,
} from "@/lib/avatar-catalog";
import { normalizeComposition } from "@/lib/character/character-rules";
import { avatarSelectionFromComposition } from "@/lib/character/avatar-system";
import type {
  AnimalId,
  CharacterComposition,
} from "@/lib/character/character-types";

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick<T>(values: readonly T[], seed: number, offset: number): T {
  return values[(seed + offset * 2654435761) % values.length];
}

function animalIdFromName(value: string): AnimalId | null {
  const normalized = normalizeSupportedPersonaAnimalName(value);
  const exactMatch = normalized
    ? AVATAR_CATALOG.find(
        (item) => AVATAR_ANIMAL_LABELS[item.animalId] === normalized,
      )
    : undefined;

  if (exactMatch) return exactMatch.animalId;

  const titleMatch = AVATAR_CATALOG.find(({ animalId }) =>
    value.includes(AVATAR_ANIMAL_LABELS[animalId]),
  );
  return titleMatch?.animalId ?? null;
}

function animalFrom(result: PersonaAnalysisResult): AnimalId {
  const rankedAnimalName = [...result.animalTypes]
    .sort((left, right) => right.score - left.score)[0]?.name;
  return animalIdFromName(rankedAnimalName ?? "") ?? "golden-retriever";
}

export function mapAvatarInputToCharacter(
  animalTypes: readonly { name: string; score?: number }[],
  personaTitle: string,
): CharacterComposition {
  const rankedAnimalName = [...animalTypes]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0]?.name ?? "";
  // Legacy personas can be rendered from different data sources: discovery
  // has animalTypes while chat lists only have personaTitle. Use the shared
  // title as the stable fallback identity so they never receive different
  // animal/outfit combinations on different screens.
  const name = personaTitle.trim() || rankedAnimalName;
  const animal =
    animalIdFromName(rankedAnimalName) ??
    animalIdFromName(name) ??
    "golden-retriever";
  const seedText = `legacy:${name || "character"}`;
  const seed = hash(seedText);
  const eyes = pick(["gentle", "bright", "chic", "focused", "cozy", "curious"] as const, seed, 1);
  const mouth = pick(["small-smile", "warm-smile", "big-smile", "playful-smirk", "shy-smile"] as const, seed, 2);
  const composition: CharacterComposition = {
    animal,
    eyes,
    eyebrows: eyes,
    mouth,
    outfitBase: pick(["cream-knit", "coral-hoodie", "navy-shirt", "sage-cardigan", "lavender-sweater"] as const, seed, 3),
    background: pick(["minimal-coral", "minimal-sage", "minimal-lavender"] as const, seed, 4),
    palette: pick(["coral-cream", "sage-cream", "lavender-cream"] as const, seed, 5),
    seed: seedText,
    version: 1,
  };
  return {
    ...composition,
    avatarSelection: avatarSelectionFromComposition(composition),
  };
}

export function mapAnalysisToCharacter(
  result: PersonaAnalysisResult,
  ownerSeed: string,
): CharacterComposition {
  const stableSeed = `${ownerSeed}:${result.personaTitle}:${result.animalTypes
    .map(({ name, score }) => `${name}:${score}`).join("|")}`;
  const seed = hash(stableSeed);
  const traits = result.visualTraits;
  const eyes = traits.playful >= 70 ? "curious"
    : traits.calm >= 75 ? "cozy"
    : traits.stylish >= 70 ? "chic"
    : traits.reliable >= 70 ? "focused"
    : traits.friendly >= 70 ? "gentle" : pick(["bright", "confident", "delicate"] as const, seed, 1);
  const mouth = traits.playful >= 70 ? "playful-smirk"
    : traits.friendly >= 70 ? "warm-smile"
    : traits.cute >= 70 ? "shy-smile"
    : pick(["small-smile", "big-smile", "neutral"] as const, seed, 2);
  const stylish = traits.stylish >= 68;
  const composition: CharacterComposition = {
    animal: animalFrom(result),
    eyes,
    eyebrows: eyes,
    mouth,
    outfitBase: traits.reliable >= 70 ? "navy-shirt"
      : traits.cute >= 70 ? "lavender-sweater" : "cream-knit",
    faceEffect: traits.cute >= 68 ? "soft-blush" : undefined,
    faceAccessory: stylish
      ? pick(["round-glasses", "thin-glasses"] as const, seed, 3) : undefined,
    background: traits.calm >= 75 ? "minimal-sage"
      : traits.stylish >= 72 ? "minimal-lavender" : "minimal-coral",
    palette: traits.calm >= 75 ? "sage-cream"
      : traits.stylish >= 72 ? "lavender-cream" : "coral-cream",
    foregroundEffect: traits.playful >= 78 ? "tiny-stars"
      : traits.friendly >= 82 ? "soft-hearts" : undefined,
    seed: stableSeed,
    version: 1,
  };
  const normalized = normalizeComposition(composition);
  return {
    ...normalized,
    avatarSelection: avatarSelectionFromComposition(normalized),
  };
}
