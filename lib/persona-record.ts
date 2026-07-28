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

export function getPersonaResultFromRecord(
  value: unknown,
): PersonaAnalysisResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  return parsePersonaAnalysisResult({
    animalTypes: record.animal_types,
    moodKeywords: record.mood_keywords,
    personaTitle: record.persona_title,
    personaDescription: record.persona_description,
    nicknameCandidates: record.nickname_candidates,
    visualTraits: record.visual_traits,
  });
}
