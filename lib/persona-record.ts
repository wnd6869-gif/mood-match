import {
  parsePersonaAnalysisResult,
  type PersonaAnalysisResult,
} from "@/lib/persona-analysis";
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

const LEGACY_ID_FALLBACK_ANIMALS = ["수달", "여우", "강아지"] as const;

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

  return parsePersonaAnalysisResult({
    ...storedResult,
    nicknameCandidates: createLegacyNicknameCandidates(
      record.animal_types,
    ),
  });
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
