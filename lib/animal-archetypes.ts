export const VISUAL_TRAIT_KEYS = [
  "friendly",
  "cute",
  "calm",
  "playful",
  "stylish",
  "reliable",
] as const;

export type VisualTrait = (typeof VISUAL_TRAIT_KEYS)[number];
export type VisualTraits = Record<VisualTrait, number>;

export const VISUAL_ARCHETYPES = {
  friendly_warm: {
    label: "다정하고 편안한 사람",
    shortLabel: "친근하고 다정한",
    traitWeights: {
      friendly: 100,
      cute: 35,
      calm: 55,
      playful: 45,
      stylish: 25,
      reliable: 65,
    },
  },
  cute_cozy: {
    label: "귀엽고 포근한 사람",
    shortLabel: "귀엽고 포근한",
    traitWeights: {
      friendly: 60,
      cute: 100,
      calm: 65,
      playful: 50,
      stylish: 25,
      reliable: 45,
    },
  },
  calm_mysterious: {
    label: "차분하고 신비로운 사람",
    shortLabel: "차분하고 신비로운",
    traitWeights: {
      friendly: 30,
      cute: 35,
      calm: 100,
      playful: 20,
      stylish: 65,
      reliable: 60,
    },
  },
  smart_stylish: {
    label: "세련되고 영리한 사람",
    shortLabel: "세련되고 영리한",
    traitWeights: {
      friendly: 35,
      cute: 25,
      calm: 60,
      playful: 35,
      stylish: 100,
      reliable: 60,
    },
  },
  reliable_strong: {
    label: "듬직하고 안정적인 사람",
    shortLabel: "듬직하고 안정적인",
    traitWeights: {
      friendly: 55,
      cute: 25,
      calm: 70,
      playful: 25,
      stylish: 40,
      reliable: 100,
    },
  },
  bright_playful: {
    label: "밝고 장난기 많은 사람",
    shortLabel: "밝고 장난기 많은",
    traitWeights: {
      friendly: 70,
      cute: 50,
      calm: 20,
      playful: 100,
      stylish: 35,
      reliable: 35,
    },
  },
} as const satisfies Record<
  string,
  {
    label: string;
    shortLabel: string;
    traitWeights: VisualTraits;
  }
>;

export type VisualArchetype = keyof typeof VISUAL_ARCHETYPES;

export const VISUAL_ARCHETYPE_OPTIONS = [
  "cute_cozy",
  "calm_mysterious",
  "friendly_warm",
  "smart_stylish",
  "reliable_strong",
  "bright_playful",
] satisfies readonly VisualArchetype[];

export const ANIMAL_ARCHETYPE_MAP = {
  수달: ["friendly_warm", "bright_playful"],
  햄스터: ["cute_cozy"],
  강아지: ["friendly_warm", "reliable_strong"],
  고양이: ["calm_mysterious", "smart_stylish"],
  여우: ["smart_stylish", "calm_mysterious"],
  토끼: ["cute_cozy", "calm_mysterious"],
  곰: ["reliable_strong", "friendly_warm"],
  늑대: ["reliable_strong", "calm_mysterious"],
  사슴: ["calm_mysterious", "cute_cozy"],
  펭귄: ["friendly_warm", "cute_cozy"],
  셰퍼드: ["reliable_strong", "smart_stylish"],
  리트리버: ["friendly_warm", "bright_playful"],
  진돗개: ["reliable_strong", "calm_mysterious"],
  카피바라: ["friendly_warm", "reliable_strong"],
  라쿤: ["bright_playful", "friendly_warm"],
  미어캣: ["friendly_warm", "smart_stylish"],
  부엉이: ["smart_stylish", "calm_mysterious"],
  알파카: ["cute_cozy", "bright_playful"],
} as const satisfies Record<string, readonly VisualArchetype[]>;

export const PREFERRED_ANIMAL_OPTIONS = [
  "강아지",
  "고양이",
  "여우",
  "토끼",
  "수달",
  "햄스터",
  "곰",
  "늑대",
  "사슴",
  "펭귄",
  "카피바라",
  "라쿤",
  "미어캣",
  "부엉이",
  "알파카",
  "상관없음",
] as const;

export type PreferredAnimal = (typeof PREFERRED_ANIMAL_OPTIONS)[number];

type AnimalTypeScore = {
  name: string;
  score: number;
};

const NEUTRAL_VISUAL_TRAITS: VisualTraits = {
  friendly: 50,
  cute: 50,
  calm: 50,
  playful: 50,
  stylish: 50,
  reliable: 50,
};

function clampTrait(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isVisualArchetype(value: unknown): value is VisualArchetype {
  return (
    typeof value === "string" &&
    Object.hasOwn(VISUAL_ARCHETYPES, value)
  );
}

export function isPreferredAnimal(value: unknown): value is PreferredAnimal {
  return (
    typeof value === "string" &&
    PREFERRED_ANIMAL_OPTIONS.includes(value as PreferredAnimal)
  );
}

export function getAnimalArchetypes(
  animalName: string,
): readonly VisualArchetype[] {
  const normalizedName = animalName.trim().replace(/상$/, "");
  const directMatch =
    ANIMAL_ARCHETYPE_MAP[
      normalizedName as keyof typeof ANIMAL_ARCHETYPE_MAP
    ];

  if (directMatch) {
    return directMatch;
  }

  const keywordMatch = Object.entries(ANIMAL_ARCHETYPE_MAP).find(
    ([knownAnimal]) =>
      normalizedName.includes(knownAnimal) ||
      knownAnimal.includes(normalizedName),
  );

  return keywordMatch?.[1] ?? [];
}

export function deriveVisualTraitsFromAnimalTypes(
  animalTypes: readonly AnimalTypeScore[],
): VisualTraits {
  const totals = Object.fromEntries(
    VISUAL_TRAIT_KEYS.map((trait) => [trait, 0]),
  ) as VisualTraits;
  let totalWeight = 0;

  for (const animal of animalTypes) {
    const archetypes = getAnimalArchetypes(animal.name);

    if (archetypes.length === 0 || animal.score <= 0) {
      continue;
    }

    const animalWeight = animal.score / archetypes.length;
    totalWeight += animal.score;

    for (const archetype of archetypes) {
      const weights = VISUAL_ARCHETYPES[archetype].traitWeights;

      for (const trait of VISUAL_TRAIT_KEYS) {
        totals[trait] += weights[trait] * animalWeight;
      }
    }
  }

  if (totalWeight === 0) {
    return { ...NEUTRAL_VISUAL_TRAITS };
  }

  return Object.fromEntries(
    VISUAL_TRAIT_KEYS.map((trait) => [
      trait,
      clampTrait(totals[trait] / totalWeight),
    ]),
  ) as VisualTraits;
}

export function parseVisualTraits(value: unknown): VisualTraits | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const entries = VISUAL_TRAIT_KEYS.map((trait) => {
    const score = candidate[trait];

    if (
      typeof score !== "number" ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 100
    ) {
      return null;
    }

    return [trait, score] as const;
  });

  if (entries.some((entry) => entry === null)) {
    return null;
  }

  return Object.fromEntries(entries as [VisualTrait, number][]) as VisualTraits;
}

export function calculateVisualMatchScore({
  candidateTraits,
  candidateAnimalTypes,
  preferredArchetype,
  preferredAnimal,
}: {
  candidateTraits: VisualTraits;
  candidateAnimalTypes: readonly AnimalTypeScore[];
  preferredArchetype: VisualArchetype;
  preferredAnimal?: PreferredAnimal;
}) {
  const targetWeights =
    VISUAL_ARCHETYPES[preferredArchetype].traitWeights;
  const weightSum = VISUAL_TRAIT_KEYS.reduce(
    (sum, trait) => sum + targetWeights[trait],
    0,
  );
  const traitScore =
    VISUAL_TRAIT_KEYS.reduce(
      (sum, trait) =>
        sum + candidateTraits[trait] * targetWeights[trait],
      0,
    ) / weightSum;

  if (!preferredAnimal || preferredAnimal === "상관없음") {
    return clampTrait(traitScore);
  }

  const preferredArchetypes = new Set(
    getAnimalArchetypes(preferredAnimal),
  );
  const animalAffinity = candidateAnimalTypes.reduce((best, animal) => {
    const overlaps = getAnimalArchetypes(animal.name).some((archetype) =>
      preferredArchetypes.has(archetype),
    );

    return overlaps ? Math.max(best, animal.score) : best;
  }, 0);

  return clampTrait(traitScore * 0.85 + animalAffinity * 0.15);
}
