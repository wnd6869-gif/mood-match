import {
  parsePersonaAnalysisResult,
  type PersonaAnalysisResult,
} from "@/lib/persona-analysis";
import {
  isPreferredAnimal,
  isVisualArchetype,
  type PreferredAnimal,
  type VisualArchetype,
} from "@/lib/animal-archetypes";

export const FIRST_IMPRESSION_OPTIONS = [
  "강아지상",
  "고양이상",
  "여우상",
  "토끼상",
] as const;

export const MOOD_OPTIONS = [
  "차분한 사람",
  "활발한 사람",
  "다정한 사람",
  "시크한 사람",
] as const;

export const STYLE_OPTIONS = [
  "자연스러운 스타일",
  "깔끔한 스타일",
  "개성 있는 스타일",
  "세련된 스타일",
] as const;

export const RELATIONSHIP_OPTIONS = [
  "친구 같은 연애",
  "표현이 많은 연애",
  "안정적인 연애",
  "설레는 연애",
] as const;

export type FirstImpression = (typeof FIRST_IMPRESSION_OPTIONS)[number];
export type MoodPreference = (typeof MOOD_OPTIONS)[number];
export type StylePreference = (typeof STYLE_OPTIONS)[number];
export type RelationshipPreference = (typeof RELATIONSHIP_OPTIONS)[number];

export type IdealSelections = {
  visualArchetype?: VisualArchetype;
  preferredAnimal?: PreferredAnimal;
  /** Legacy prototype fields kept so previously saved browser data still loads. */
  firstImpression?: FirstImpression;
  mood?: MoodPreference;
  style?: StylePreference;
  relationship?: RelationshipPreference;
};

export type IdealSelectionKey = keyof IdealSelections;

export type PrototypeData = {
  idealSelections: IdealSelections;
  personaAnalysis: {
    ownerId: string;
    result: PersonaAnalysisResult;
  } | null;
};

export type StorageResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

const STORAGE_KEY = "mood-match:prototype:v1";
const STORAGE_EVENT = "mood-match:prototype-storage";

const EMPTY_DATA: PrototypeData = {
  idealSelections: {},
  personaAnalysis: null,
};

function includesOption<T extends string>(
  options: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function sanitizeIdealSelections(value: unknown): IdealSelections {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const selections: IdealSelections = {};

  if (isVisualArchetype(candidate.visualArchetype)) {
    selections.visualArchetype = candidate.visualArchetype;
  }

  if (isPreferredAnimal(candidate.preferredAnimal)) {
    selections.preferredAnimal = candidate.preferredAnimal;
  }

  if (
    includesOption(FIRST_IMPRESSION_OPTIONS, candidate.firstImpression)
  ) {
    selections.firstImpression = candidate.firstImpression;

    if (!selections.visualArchetype) {
      const legacyArchetypeMap: Record<
        FirstImpression,
        VisualArchetype
      > = {
        강아지상: "friendly_warm",
        고양이상: "calm_mysterious",
        여우상: "smart_stylish",
        토끼상: "cute_cozy",
      };
      selections.visualArchetype =
        legacyArchetypeMap[candidate.firstImpression];
    }

    if (!selections.preferredAnimal) {
      selections.preferredAnimal = candidate.firstImpression.replace(
        /상$/,
        "",
      ) as PreferredAnimal;
    }
  }

  if (includesOption(MOOD_OPTIONS, candidate.mood)) {
    selections.mood = candidate.mood;
  }

  if (includesOption(STYLE_OPTIONS, candidate.style)) {
    selections.style = candidate.style;
  }

  if (includesOption(RELATIONSHIP_OPTIONS, candidate.relationship)) {
    selections.relationship = candidate.relationship;
  }

  return selections;
}

function sanitizePersonaAnalysis(
  value: unknown,
): PrototypeData["personaAnalysis"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const result = parsePersonaAnalysisResult(candidate.result);

  if (
    typeof candidate.ownerId !== "string" ||
    candidate.ownerId.length === 0 ||
    !result
  ) {
    return null;
  }

  return {
    ownerId: candidate.ownerId,
    result,
  };
}

export function parsePrototypeStorage(rawValue: string | null): PrototypeData {
  if (!rawValue) {
    return EMPTY_DATA;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    return {
      idealSelections: sanitizeIdealSelections(parsed.idealSelections),
      personaAnalysis: sanitizePersonaAnalysis(parsed.personaAnalysis),
    };
  } catch {
    return EMPTY_DATA;
  }
}

export function getPrototypeStorageSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function subscribePrototypeStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function storageError(error: unknown): StorageResult {
  const isQuotaError =
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED");

  return {
    ok: false,
    error: isQuotaError
      ? "브라우저 저장 공간이 부족해요. 더 작은 사진을 선택해주세요."
      : "테스트 데이터를 브라우저에 저장하지 못했어요. 다시 시도해주세요.",
  };
}

function writePrototypeData(data: PrototypeData): StorageResult {
  if (typeof window === "undefined") {
    return {
      ok: false,
      error: "브라우저에서만 데이터를 저장할 수 있어요.",
    };
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(STORAGE_EVENT));
    return { ok: true };
  } catch (error) {
    return storageError(error);
  }
}

function readPrototypeData(): PrototypeData {
  return parsePrototypeStorage(getPrototypeStorageSnapshot());
}

export function prepareForNewPersonaAnalysis(): StorageResult {
  return writePrototypeData({
    idealSelections: readPrototypeData().idealSelections,
    personaAnalysis: null,
  });
}

export function savePersonaAnalysis(
  ownerId: string,
  value: unknown,
): StorageResult {
  const result = parsePersonaAnalysisResult(value);

  if (!ownerId || !result) {
    return {
      ok: false,
      error: "분석 결과 형식이 올바르지 않아요. 다시 분석해주세요.",
    };
  }

  return writePrototypeData({
    ...readPrototypeData(),
    personaAnalysis: {
      ownerId,
      result,
    },
  });
}

export function saveIdealSelection(
  key: IdealSelectionKey,
  value: string,
): StorageResult {
  const current = readPrototypeData();
  const nextSelections = { ...current.idealSelections };

  switch (key) {
    case "visualArchetype":
      if (!isVisualArchetype(value)) {
        return { ok: false, error: "올바른 분위기 유형이 아니에요." };
      }
      nextSelections.visualArchetype = value;
      break;
    case "preferredAnimal":
      if (!isPreferredAnimal(value)) {
        return { ok: false, error: "올바른 동물상 선택값이 아니에요." };
      }
      nextSelections.preferredAnimal = value;
      break;
    case "firstImpression":
      if (!includesOption(FIRST_IMPRESSION_OPTIONS, value)) {
        return { ok: false, error: "올바른 첫인상 선택값이 아니에요." };
      }
      nextSelections.firstImpression = value;
      break;
    case "mood":
      if (!includesOption(MOOD_OPTIONS, value)) {
        return { ok: false, error: "올바른 분위기 선택값이 아니에요." };
      }
      nextSelections.mood = value;
      break;
    case "style":
      if (!includesOption(STYLE_OPTIONS, value)) {
        return { ok: false, error: "올바른 스타일 선택값이 아니에요." };
      }
      nextSelections.style = value;
      break;
    case "relationship":
      if (!includesOption(RELATIONSHIP_OPTIONS, value)) {
        return { ok: false, error: "올바른 연애 방식 선택값이 아니에요." };
      }
      nextSelections.relationship = value;
      break;
  }

  return writePrototypeData({
    ...current,
    idealSelections: nextSelections,
  });
}

export function clearPrototypeData(): StorageResult {
  if (typeof window === "undefined") {
    return {
      ok: false,
      error: "브라우저에서만 데이터를 삭제할 수 있어요.",
    };
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(STORAGE_EVENT));
    return { ok: true };
  } catch (error) {
    return storageError(error);
  }
}
