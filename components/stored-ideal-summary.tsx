"use client";

import useOnboardingDraft from "@/hooks/use-onboarding-draft";
import {
  calculateVisualMatchScore,
  VISUAL_ARCHETYPES,
  type VisualTraits,
} from "@/lib/animal-archetypes";

export default function StoredIdealSummary({
  candidateTraits,
  candidateAnimalTypes,
}: {
  candidateTraits: VisualTraits;
  candidateAnimalTypes: { name: string; score: number }[];
}) {
  const { idealSelections } = useOnboardingDraft();
  const archetype = idealSelections.visualArchetype;
  const matchScore = archetype
    ? calculateVisualMatchScore({
        candidateTraits,
        candidateAnimalTypes,
        preferredArchetype: archetype,
        preferredAnimal: idealSelections.preferredAnimal,
      })
    : null;
  const preferences = [
    {
      label: "관심 분위기",
      value: archetype
        ? VISUAL_ARCHETYPES[archetype].shortLabel
        : undefined,
    },
    {
      label: "동물상 취향",
      value: idealSelections.preferredAnimal ?? "상관없음",
    },
  ];

  return (
    <>
      <p className="mt-3 text-sm leading-6 text-neutral-600">
        {archetype ? (
          <>
            당신이 선택한{" "}
            <span className="font-semibold text-neutral-800">
              {VISUAL_ARCHETYPES[archetype].shortLabel}
            </span>
            {" "}분위기와 이 캐릭터의 공통된 인상을 먼저 비교했어요.
            동물상 취향은 보조 기준으로만 반영했어요.
          </>
        ) : (
          "저장된 분위기 취향이 없어요. 관심 스타일 화면에서 원하는 분위기를 골라주세요."
        )}
      </p>

      {matchScore !== null && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-coral-50 px-4 py-3">
          <span className="text-sm font-semibold text-coral-700">
            분위기 공통점
          </span>
          <strong className="text-lg font-bold text-coral-700">
            {matchScore}%
          </strong>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {preferences.map((preference) => (
          <div
            key={preference.label}
            className="min-w-0 rounded-2xl bg-neutral-50 px-3 py-3"
          >
            <p className="text-xs font-medium text-neutral-400">
              {preference.label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-800">
              {preference.value ?? "선택 전"}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
