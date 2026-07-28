"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { ActionButton } from "@/components/action";
import ChoiceCard from "@/components/choice-card";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  CONVERSATION_PACE_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  GROUP_SIZE_OPTIONS,
  type AvailableTimeSlot,
  type ConversationGoal,
  type ConversationMood,
  type ConversationPace,
  type ConversationPreferences,
  type ConversationTopic,
  type PreferredGroupSize,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/client";

type ConversationPreferencesFormProps = {
  userId: string;
  initialPreferences: ConversationPreferences;
  initialLoadFailed?: boolean;
  successPath?: string;
};

type MultiChoiceSectionProps<T extends string> = {
  title: string;
  description: string;
  options: readonly { value: T; label: string }[];
  values: T[];
  min: number;
  max: number;
  disabled: boolean;
  onToggle: (value: T) => void;
};

function MultiChoiceSection<T extends string>({
  title,
  description,
  options,
  values,
  min,
  max,
  disabled,
  onToggle,
}: MultiChoiceSectionProps<T>) {
  return (
    <fieldset className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <legend className="px-1 text-base font-bold text-neutral-900">
        {title}
      </legend>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-neutral-500">{description}</p>
        <span className="shrink-0 text-xs font-semibold text-coral-600">
          {values.length}/{max}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {options.map((option) => {
          const selected = values.includes(option.value);
          const atLimit = values.length >= max && !selected;

          return (
            <ChoiceCard
              key={option.value}
              label={option.label}
              selected={selected}
              disabled={disabled || atLimit}
              multiSelect
              onClick={() => onToggle(option.value)}
            />
          );
        })}
      </div>
      <p className="mt-3 text-xs text-neutral-400">
        최소 {min}개, 최대 {max}개 선택
      </p>
    </fieldset>
  );
}

export default function ConversationPreferencesForm({
  userId,
  initialPreferences,
  initialLoadFailed = false,
  successPath = "/home",
}: ConversationPreferencesFormProps) {
  const router = useRouter();
  const [goal, setGoal] = useState<ConversationGoal | null>(
    initialPreferences.conversation_goal,
  );
  const [moods, setMoods] = useState<ConversationMood[]>(
    initialPreferences.conversation_moods,
  );
  const [topics, setTopics] = useState<ConversationTopic[]>(
    initialPreferences.conversation_topics,
  );
  const [pace, setPace] = useState<ConversationPace | null>(
    initialPreferences.conversation_pace,
  );
  const [groupSize, setGroupSize] =
    useState<PreferredGroupSize | null>(
      initialPreferences.preferred_group_size,
    );
  const [timeSlots, setTimeSlots] = useState<AvailableTimeSlot[]>(
    initialPreferences.available_time_slots,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialLoadFailed
      ? "대화 설정을 불러오지 못했어요. SQL 실행 여부를 확인해주세요."
      : null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null,
  );

  const isComplete = useMemo(
    () =>
      Boolean(goal) &&
      moods.length >= 1 &&
      moods.length <= 4 &&
      topics.length >= 1 &&
      topics.length <= 6 &&
      Boolean(pace) &&
      Boolean(groupSize) &&
      timeSlots.length >= 1,
    [goal, groupSize, moods.length, pace, timeSlots.length, topics.length],
  );

  function toggleMood(value: ConversationMood) {
    setErrorMessage(null);
    setMoods((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 4
          ? [...current, value]
          : current,
    );
  }

  function toggleTopic(value: ConversationTopic) {
    setErrorMessage(null);
    setTopics((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 6
          ? [...current, value]
          : current,
    );
  }

  function toggleTimeSlot(value: AvailableTimeSlot) {
    setErrorMessage(null);
    setTimeSlots((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !isComplete) {
      return;
    }

    if (!goal || !pace || !groupSize) {
      setErrorMessage("필수 항목을 모두 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const supabase = createClient();

    if (!supabase) {
      setErrorMessage("Supabase 환경변수 설정을 확인해주세요.");
      setIsSubmitting(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || user.id !== userId) {
      router.replace("/login");
      router.refresh();
      return;
    }

    const { error } = await supabase.rpc(
      "save_conversation_preferences",
      {
        p_conversation_goal: goal,
        p_conversation_moods: moods,
        p_conversation_topics: topics,
        p_conversation_pace: pace,
        p_preferred_group_size: groupSize,
        p_available_time_slots: timeSlots,
      },
    );

    if (error) {
      if (error.code === "42883" || error.code === "42703") {
        setErrorMessage(
          "대화 설정 저장 함수가 아직 없어요. public-chat-profile.sql을 먼저 실행해주세요.",
        );
      } else if (error.code === "42501") {
        setErrorMessage("대화 설정을 수정할 권한이 없어요.");
      } else {
        setErrorMessage(
          "대화 설정을 저장하지 못했어요. 선택값을 확인하고 다시 시도해주세요.",
        );
      }
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("대화 분위기 설정을 저장했어요.");
    window.setTimeout(() => {
      router.replace(successPath);
      router.refresh();
    }, 650);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <fieldset className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">
          지금 원하는 대화
        </legend>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          현재 가장 끌리는 대화 목적 하나를 골라주세요.
        </p>
        <div className="mt-4 space-y-2.5">
          {CONVERSATION_GOAL_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              label={option.label}
              selected={goal === option.value}
              disabled={isSubmitting}
              onClick={() => setGoal(option.value)}
            />
          ))}
        </div>
      </fieldset>

      <MultiChoiceSection
        title="원하는 대화 분위기"
        description="함께 느끼고 싶은 분위기를 골라주세요."
        options={CONVERSATION_MOOD_OPTIONS}
        values={moods}
        min={1}
        max={4}
        disabled={isSubmitting}
        onToggle={toggleMood}
      />

      <MultiChoiceSection
        title="관심 주제"
        description="편하게 이야기할 수 있는 주제를 골라주세요."
        options={CONVERSATION_TOPIC_OPTIONS}
        values={topics}
        min={1}
        max={6}
        disabled={isSubmitting}
        onToggle={toggleTopic}
      />

      <fieldset className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">
          대화 속도
        </legend>
        <div className="mt-4 space-y-2.5">
          {CONVERSATION_PACE_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              label={option.label}
              selected={pace === option.value}
              disabled={isSubmitting}
              onClick={() => setPace(option.value)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">
          선호 대화 형태
        </legend>
        <div className="mt-4 space-y-2.5">
          {GROUP_SIZE_OPTIONS.map((option) => (
            <ChoiceCard
              key={option.value}
              label={option.label}
              selected={groupSize === option.value}
              disabled={isSubmitting}
              onClick={() => setGroupSize(option.value)}
            />
          ))}
        </div>
      </fieldset>

      <MultiChoiceSection
        title="주로 접속하는 시간"
        description="여러 시간대를 선택할 수 있어요."
        options={AVAILABLE_TIME_OPTIONS}
        values={timeSlots}
        min={1}
        max={4}
        disabled={isSubmitting}
        onToggle={toggleTimeSlot}
      />

      {errorMessage && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
        >
          {successMessage}
        </p>
      )}

      <ActionButton
        type="submit"
        disabled={!isComplete || isSubmitting}
        aria-label="선택한 대화 분위기 설정 저장하기"
      >
        {isSubmitting
          ? "저장 중..."
          : successPath === "/match-preview"
            ? "저장하고 실제 추천 보기"
            : "대화 설정 저장하기"}
      </ActionButton>
      {!isComplete && (
        <p className="text-center text-xs leading-5 text-neutral-400">
          모든 필수 항목을 선택하면 저장할 수 있어요.
        </p>
      )}
    </form>
  );
}
