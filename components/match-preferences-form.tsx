"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton } from "@/components/action";
import ChoiceCard from "@/components/choice-card";
import {
  PREFERRED_ANIMAL_OPTIONS,
  VISUAL_ARCHETYPES,
  VISUAL_ARCHETYPE_OPTIONS,
  type PreferredAnimal,
  type VisualArchetype,
} from "@/lib/animal-archetypes";
import type { MatchPreference } from "@/lib/match-preference";
import { createClient } from "@/lib/supabase/client";

export default function MatchPreferencesForm({
  userId,
  initialPreference,
}: {
  userId: string;
  initialPreference: MatchPreference | null;
}) {
  const router = useRouter();
  const [visualArchetype, setVisualArchetype] =
    useState<VisualArchetype | null>(
      initialPreference?.visual_archetype ?? null,
    );
  const [preferredAnimal, setPreferredAnimal] =
    useState<PreferredAnimal | null>(
      initialPreference?.preferred_animal ?? null,
    );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!visualArchetype || isSubmitting) {
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setErrorMessage("Supabase 환경변수 설정을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.from("match_preferences").upsert(
      {
        user_id: userId,
        visual_archetype: visualArchetype,
        preferred_animal:
          preferredAnimal === "상관없음" ? null : preferredAnimal,
      },
      { onConflict: "user_id" },
    );

    if (error) {
      setErrorMessage(
        error.code === "42P01"
          ? "추천 취향 테이블이 아직 없어요. match-recommendations SQL을 적용해주세요."
          : "관심 스타일을 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push(
      "/profile/conversation-preferences?next=/match-preview",
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <fieldset className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">
          어떤 분위기에 끌리나요?
        </legend>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          추천에서 가장 크게 반영되는 기준이에요.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {VISUAL_ARCHETYPE_OPTIONS.map((value) => (
            <ChoiceCard
              key={value}
              label={VISUAL_ARCHETYPES[value].label}
              selected={visualArchetype === value}
              disabled={isSubmitting}
              onClick={() => setVisualArchetype(value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-[2rem] border border-neutral-200 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">
          특히 끌리는 동물상이 있나요?
        </legend>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          선택사항이며 분위기보다 약하게 반영해요.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {PREFERRED_ANIMAL_OPTIONS.map((value) => (
            <ChoiceCard
              key={value}
              label={value}
              selected={preferredAnimal === value}
              disabled={isSubmitting}
              onClick={() =>
                setPreferredAnimal((current) =>
                  current === value ? null : value,
                )
              }
            />
          ))}
        </div>
      </fieldset>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <ActionButton
        type="submit"
        disabled={!visualArchetype || isSubmitting}
      >
        {isSubmitting ? "저장 중..." : "대화 취향도 이어서 설정하기"}
      </ActionButton>
    </form>
  );
}
