"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import StepProgress from "@/components/step-progress";
import usePrototypeData from "@/hooks/use-prototype-data";
import {
  type IdealSelectionKey,
  saveIdealSelection,
} from "@/lib/prototype-storage";
import {
  PREFERRED_ANIMAL_OPTIONS,
  VISUAL_ARCHETYPES,
  VISUAL_ARCHETYPE_OPTIONS,
} from "@/lib/animal-archetypes";

const IDEAL_QUESTIONS = [
  {
    key: "visualArchetype",
    title: "어떤 분위기에 가장 끌리나요?",
    description:
      "동물 이름보다 공통된 인상과 분위기를 기준으로 골라주세요.",
    options: VISUAL_ARCHETYPE_OPTIONS.map((value) => ({
      value,
      label: VISUAL_ARCHETYPES[value].label,
    })),
    required: true,
  },
  {
    key: "preferredAnimal",
    title: "특히 끌리는 동물상이 있나요?",
    description:
      "선택하지 않아도 괜찮아요. 캐릭터 추천에서는 분위기를 더 중요하게 봐요.",
    options: PREFERRED_ANIMAL_OPTIONS.map((value) => ({
      value,
      label: value,
    })),
    required: false,
  },
] as const;

export default function IdealPage() {
  const router = useRouter();
  const { idealSelections: selections } = usePrototypeData();
  const [storageError, setStorageError] = useState<string | null>(null);

  const isComplete = Boolean(selections.visualArchetype);

  function selectOption(question: IdealSelectionKey, option: string) {
    const result = saveIdealSelection(question, option);
    setStorageError(result.ok ? null : result.error);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isComplete) {
      router.push("/match-preview");
    }
  }

  return (
    <AppShell>
      <BackLink href="/result" ariaLabel="AI 캐릭터 결과 화면으로 돌아가기" />
      <StepProgress current={4} total={5} label="관심 스타일" />

      <header className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-coral-600">
            관심 가는 캐릭터 찾기
          </p>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm">
            필수 {isComplete ? "1 / 1 완료" : "0 / 1"}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          어떤 캐릭터가
          <br />
          눈에 들어오나요?
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          편하게 이야기해보고 싶은 분위기를 먼저 고르고, 원한다면 동물상
          취향을 더해주세요.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mt-7">
        <div className="space-y-4">
          {IDEAL_QUESTIONS.map((question, questionIndex) => (
            <fieldset
              key={question.key}
              className={`rounded-3xl border bg-white p-5 shadow-sm transition-colors duration-200 ${
                selections[question.key]
                  ? "border-coral-200"
                  : "border-neutral-200/80"
              }`}
            >
              <legend className="sr-only">{question.title}</legend>
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-coral-50 text-xs font-bold text-coral-600">
                  {questionIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-neutral-900">
                      {question.title}
                    </h2>
                    {selections[question.key] ? (
                      <span className="shrink-0 text-xs font-semibold text-coral-600">
                        선택 완료
                      </span>
                    ) : !question.required ? (
                      <span className="shrink-0 text-xs font-semibold text-neutral-400">
                        선택사항
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {question.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {question.options.map((option) => {
                  const isSelected =
                    selections[question.key] === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${question.title}: ${option.label}${isSelected ? ", 선택됨" : ""}`}
                      onClick={() =>
                        selectOption(
                          question.key as IdealSelectionKey,
                          option.value,
                        )
                      }
                      className={`flex min-h-14 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 active:scale-[0.98] ${
                        isSelected
                          ? "border-coral-500 bg-coral-50 text-coral-700 shadow-[0_0_0_1px_rgba(231,111,97,0.15)]"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      <span className="min-w-0">{option.label}</span>
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? "border-coral-500 bg-coral-500 text-white"
                            : "border-neutral-300 bg-white text-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="none"
                          className="size-3"
                        >
                          <path
                            d="m5 10 3 3 7-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {storageError && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {storageError}
          </p>
        )}

        <ActionButton
          type="submit"
          disabled={!isComplete}
          className="mt-6"
          aria-label="선택한 관심 스타일로 캐릭터 추천 보기"
        >
          이 스타일로 캐릭터 보기
        </ActionButton>
      </form>

      <p className="mt-3 text-center text-xs leading-5 text-neutral-400">
        분위기 선택은 필수이고 동물상 선택은 선택사항이에요.
      </p>
    </AppShell>
  );
}
