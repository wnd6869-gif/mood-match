export const CHARACTER_AVATARS = {
  otter: {
    label: "수달",
    src: "/characters/otter.webp",
    accent: "mint",
    surfaceClass: "bg-[#dff7ed]",
    textClass: "text-[#28755f]",
    ringClass: "ring-[#9fddc8]",
  },
  cat: {
    label: "고양이",
    src: "/characters/cat.webp",
    accent: "lilac",
    surfaceClass: "bg-[#eee7ff]",
    textClass: "text-[#6c54a3]",
    ringClass: "ring-[#cbbaf5]",
  },
  dog: {
    label: "강아지",
    src: "/characters/dog.webp",
    accent: "orange",
    surfaceClass: "bg-[#fff0d9]",
    textClass: "text-[#9b5a18]",
    ringClass: "ring-[#f5c47b]",
  },
  deer: {
    label: "사슴",
    src: "/characters/deer.webp",
    accent: "sage",
    surfaceClass: "bg-[#e9eddf]",
    textClass: "text-[#64704c]",
    ringClass: "ring-[#bcc7a3]",
  },
  fox: {
    label: "여우",
    src: "/characters/fox.webp",
    accent: "coral",
    surfaceClass: "bg-coral-50",
    textClass: "text-coral-700",
    ringClass: "ring-coral-200",
  },
} as const;

export type CharacterAvatarKey = keyof typeof CHARACTER_AVATARS;

type AnimalType = {
  name: string;
  score?: number;
};

const ANIMAL_KEYWORDS: Record<CharacterAvatarKey, readonly string[]> = {
  otter: ["수달", "펭귄", "햄스터", "토끼", "곰"],
  cat: ["고양이"],
  dog: ["강아지", "리트리버", "셰퍼드", "진돗개", "개"],
  deer: ["사슴"],
  fox: ["여우", "늑대"],
};

export function getCharacterAvatarKey(
  animalTypes: readonly AnimalType[] = [],
  personaTitle = "",
): CharacterAvatarKey {
  const orderedNames = [...animalTypes]
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .map((animal) => animal.name);
  const haystack = [...orderedNames, personaTitle].join(" ");

  for (const key of Object.keys(
    ANIMAL_KEYWORDS,
  ) as CharacterAvatarKey[]) {
    if (
      ANIMAL_KEYWORDS[key].some((keyword) =>
        haystack.includes(keyword),
      )
    ) {
      return key;
    }
  }

  return "otter";
}

export function getCharacterAvatar(
  animalTypes: readonly AnimalType[] = [],
  personaTitle = "",
) {
  const key = getCharacterAvatarKey(animalTypes, personaTitle);

  return {
    key,
    ...CHARACTER_AVATARS[key],
  };
}
