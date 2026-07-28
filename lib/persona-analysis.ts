import {
  deriveVisualTraitsFromAnimalTypes,
  parseVisualTraits,
  type VisualTraits,
} from "@/lib/animal-archetypes";

export type AnimalTypeScore = {
  name: string;
  score: number;
};

export type PersonaAnalysisResult = {
  animalTypes: AnimalTypeScore[];
  moodKeywords: string[];
  personaTitle: string;
  personaDescription: string;
  nicknameCandidates: string[];
  visualTraits: VisualTraits;
};

export const FORCE_REANALYSIS_SESSION_KEY =
  "mood-match:force-persona-analysis";

export const SAFE_PERSONA_RESULT: PersonaAnalysisResult = {
  animalTypes: [
    { name: "셰퍼드", score: 45 },
    { name: "늑대", score: 30 },
    { name: "수달", score: 25 },
  ],
  moodKeywords: [
    "차분함",
    "신뢰감",
    "관찰력",
    "깔끔함",
    "은근한 장난기",
  ],
  personaTitle: "차분한 셰퍼드형",
  personaDescription:
    "사진에서는 차분하고 단정한 인상이 먼저 느껴지고, 편안한 장난기도 은은하게 전해져요.",
  nicknameCandidates: [
    "퇴근한셰퍼드",
    "조용한늑대",
    "안경쓴수달",
  ],
  visualTraits: {
    friendly: 68,
    cute: 42,
    calm: 82,
    playful: 48,
    stylish: 70,
    reliable: 86,
  },
};

function isKoreanText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    /[가-힣]/.test(value)
  );
}

function hasUniqueValues(values: string[]) {
  return new Set(values).size === values.length;
}

export function parsePersonaAnalysisResult(
  value: unknown,
  options: { requireVisualTraits?: boolean } = {},
): PersonaAnalysisResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !Array.isArray(candidate.animalTypes) ||
    candidate.animalTypes.length !== 3
  ) {
    return null;
  }

  const animalTypes: AnimalTypeScore[] = [];

  for (const item of candidate.animalTypes) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const animal = item as Record<string, unknown>;

    if (
      !isKoreanText(animal.name, 20) ||
      typeof animal.score !== "number" ||
      !Number.isInteger(animal.score) ||
      animal.score < 0 ||
      animal.score > 100
    ) {
      return null;
    }

    animalTypes.push({ name: animal.name.trim(), score: animal.score });
  }

  if (
    animalTypes.reduce((sum, animal) => sum + animal.score, 0) !== 100 ||
    !hasUniqueValues(animalTypes.map((animal) => animal.name))
  ) {
    return null;
  }

  if (
    !Array.isArray(candidate.moodKeywords) ||
    candidate.moodKeywords.length !== 5 ||
    !candidate.moodKeywords.every((item) => isKoreanText(item, 30))
  ) {
    return null;
  }

  const moodKeywords = candidate.moodKeywords.map((item) => item.trim());

  if (!hasUniqueValues(moodKeywords)) {
    return null;
  }

  if (
    !isKoreanText(candidate.personaTitle, 40) ||
    !isKoreanText(candidate.personaDescription, 240) ||
    !Array.isArray(candidate.nicknameCandidates) ||
    candidate.nicknameCandidates.length !== 3 ||
    !candidate.nicknameCandidates.every((item) =>
      isKoreanText(item, 30),
    )
  ) {
    return null;
  }

  const nicknameCandidates = candidate.nicknameCandidates.map((item) =>
    item.trim(),
  );

  if (!hasUniqueValues(nicknameCandidates)) {
    return null;
  }

  const visualTraits = parseVisualTraits(candidate.visualTraits);

  if (options.requireVisualTraits && !visualTraits) {
    return null;
  }

  return {
    animalTypes,
    moodKeywords,
    personaTitle: candidate.personaTitle.trim(),
    personaDescription: candidate.personaDescription.trim(),
    nicknameCandidates,
    visualTraits:
      visualTraits ?? deriveVisualTraitsFromAnimalTypes(animalTypes),
  };
}
