import {
  parsePersonaAnalysisResult,
  type PersonaAnalysisResult,
} from "@/lib/persona-analysis";

export const PERSONA_SELECT_COLUMNS =
  "id, user_id, photo_path, animal_types, mood_keywords, persona_title, persona_description, nickname_candidates, visual_traits, model_name, input_tokens, output_tokens, total_tokens, analysis_source, created_at";

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
