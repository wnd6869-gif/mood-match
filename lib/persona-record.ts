import {
  parsePersonaAnalysisResult,
  SAFE_PERSONA_RESULT,
  type PersonaAnalysisResult,
} from "@/lib/persona-analysis";
import {
  deriveVisualTraitsFromAnimalTypes,
  parseVisualTraits,
} from "@/lib/animal-archetypes";
import {
  normalizeSupportedPersonaAnimalName,
  SUPPORTED_PERSONA_ANIMAL_NAMES,
} from "@/lib/avatar-catalog";
import { mapAnalysisToCharacter } from "@/lib/character/character-mapper";
import type {
  AvatarSelection,
  CharacterComposition,
} from "@/lib/character/character-types";
import {
  recipeToComposition,
  type CharacterRecipe,
} from "@/lib/character-casting";

export const PERSONA_SELECT_COLUMNS =
  "*";

export type PersonaRecord = {
  id: string;
  user_id: string;
  photo_path: string;
  animal_types: unknown;
  mood_keywords: unknown;
  persona_title: string;
  persona_description: string;
  nickname_candidates: unknown;
  visual_traits: unknown | null;
  model_name: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  analysis_source: string;
  created_at: string;
  character_composition?: unknown;
  avatar_selection?: unknown;
  character_recipe?: unknown;
  avatar_system_version?: string | null;
  avatar_updated_at?: string | null;
};

const LEGACY_ID_ADJECTIVE_PAIRS = [
  ["차분한", "다정한"],
  ["포근한", "유쾌한"],
  ["든든한", "특별한"],
] as const;

const LEGACY_ID_FALLBACK_ANIMALS = ["수달", "붉은여우", "골든리트리버"] as const;

function createLegacyNicknameCandidates(animalTypes: unknown) {
  const animals = Array.isArray(animalTypes) ? animalTypes : [];

  return LEGACY_ID_ADJECTIVE_PAIRS.map((adjectives, index) => {
    const animal = animals[index];
    const rawName =
      animal && typeof animal === "object"
        ? (animal as Record<string, unknown>).name
        : null;
    const normalizedName =
      typeof rawName === "string"
        ? rawName.replace(/[^가-힣]/g, "").slice(0, 8)
        : "";
    const animalName =
      normalizedName || LEGACY_ID_FALLBACK_ANIMALS[index];

    return `${adjectives[0]} ${adjectives[1]} ${animalName}`;
  });
}

function getLegacyAnimalNames(value: unknown) {
  const names = Array.isArray(value)
    ? value.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (!item || typeof item !== "object") return [];
      const name = (item as Record<string, unknown>).name;
      return typeof name === "string" ? [name] : [];
    })
    : [];
  const unique = Array.from(
    new Set(
      names.flatMap((name) => {
        const supported = normalizeSupportedPersonaAnimalName(name);
        return supported ? [supported] : [];
      }),
    ),
  );

  for (const fallback of SUPPORTED_PERSONA_ANIMAL_NAMES) {
    if (unique.length === 3) break;
    if (!unique.includes(fallback)) unique.push(fallback);
  }

  return unique.slice(0, 3);
}

/**
 * Old persona rows can predate the strict avatar-v1 schema. Recover their
 * display data instead of blocking a user from an already-created character.
 * New OpenAI responses remain subject to the strict analysis validator.
 */
function recoverLegacyPersonaResult(
  record: Record<string, unknown>,
): PersonaAnalysisResult {
  const animalTypes = getLegacyAnimalNames(record.animal_types).map(
    (name, index) => ({ name, score: [45, 35, 20][index] }),
  );
  const storedKeywords = Array.isArray(record.mood_keywords)
    ? record.mood_keywords.filter(
      (keyword): keyword is string =>
        typeof keyword === "string" && keyword.trim().length > 0,
    )
    : [];
  const moodKeywords = Array.from(
    new Set([
      ...storedKeywords.map((keyword) => keyword.trim()),
      ...SAFE_PERSONA_RESULT.moodKeywords,
    ]),
  ).slice(0, 5);
  const personaTitle =
    typeof record.persona_title === "string" && record.persona_title.trim()
      ? record.persona_title.trim().slice(0, 40)
      : `차분한 ${animalTypes[0]?.name ?? "수달"}형`;
  const personaDescription =
    typeof record.persona_description === "string" && record.persona_description.trim()
      ? record.persona_description.trim().slice(0, 240)
      : SAFE_PERSONA_RESULT.personaDescription;

  return {
    animalTypes,
    moodKeywords,
    personaTitle,
    personaDescription,
    nicknameCandidates: createLegacyNicknameCandidates(
      animalTypes.map(({ name }) => ({ name })),
    ),
    visualTraits:
      parseVisualTraits(record.visual_traits) ??
      deriveVisualTraitsFromAnimalTypes(animalTypes),
  };
}

export function getPersonaResultFromRecord(
  value: unknown,
): PersonaAnalysisResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const storedResult = {
    animalTypes: record.animal_types,
    moodKeywords: record.mood_keywords,
    personaTitle: record.persona_title,
    personaDescription: record.persona_description,
    nicknameCandidates: record.nickname_candidates,
    visualTraits: record.visual_traits,
  };
  const parsedResult = parsePersonaAnalysisResult(storedResult);

  if (parsedResult) {
    return parsedResult;
  }

  const parsedLegacyResult = parsePersonaAnalysisResult({
    ...storedResult,
    nicknameCandidates: createLegacyNicknameCandidates(
      record.animal_types,
    ),
  });

  return parsedLegacyResult ?? recoverLegacyPersonaResult(record);
}

function isAvatarSelection(value: unknown): value is AvatarSelection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.animalId === "string"
    && typeof candidate.outfitBaseId === "string"
    && typeof candidate.faceRigVersion === "string"
    && typeof candidate.expressionId === "string"
    && typeof candidate.backgroundId === "string";
}

export function isCharacterRecipe(value: unknown): value is CharacterRecipe {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.systemVersion === "avatar-v1"
    && typeof candidate.animalId === "string"
    && typeof candidate.outfitBaseId === "string"
    && typeof candidate.faceFamily === "string"
    && typeof candidate.faceRigVersion === "string"
    && typeof candidate.expressionId === "string"
    && typeof candidate.backgroundId === "string"
    && typeof candidate.castingSeed === "string";
}

export function getCharacterRecipeFromRecord(value: unknown): CharacterRecipe | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return isCharacterRecipe(record.character_recipe) ? record.character_recipe : null;
}

/**
 * Rebuild legacy recipe fields only when necessary. A saved AvatarSelection is
 * then attached unchanged, so cards, chat, and result pages resolve the same
 * locked FaceRig version instead of independently re-rolling a character.
 */
export function getCharacterCompositionFromRecord(
  value: unknown,
): CharacterComposition | null {
  const persona = getPersonaResultFromRecord(value);
  if (!persona || !value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const savedRecipe = getCharacterRecipeFromRecord(record);
  if (savedRecipe) return recipeToComposition(savedRecipe);
  const userId = typeof record.user_id === "string" ? record.user_id : "persona";
  const fallback = mapAnalysisToCharacter(persona, userId);
  const saved = isAvatarSelection(record.avatar_selection)
    ? record.avatar_selection
    : isAvatarSelection(
      record.character_composition
        && typeof record.character_composition === "object"
        ? (record.character_composition as Record<string, unknown>).avatarSelection
        : null,
    )
      ? (record.character_composition as Record<string, unknown>).avatarSelection as AvatarSelection
      : undefined;
  return saved ? { ...fallback, avatarSelection: saved } : fallback;
}
