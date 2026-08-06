"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { ActionButton } from "@/components/action";
import ChoiceCard from "@/components/choice-card";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  CONVERSATION_PACE_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  type AvailableTimeSlot,
  type ConversationGoal,
  type ConversationMood,
  type ConversationPace,
  type ConversationPreferences,
  type ConversationTopic,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/client";

type ConversationPreferencesFormProps = {
  userId: string;
  initialPreferences: ConversationPreferences;
  initialLoadFailed?: boolean;
  successPath?: string;
};

const RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: ConversationGoal;
  label: string;
}> = [
  { value: "casual_chat", label: "가벼운 일상 대화" },
  { value: "hobby_chat", label: "취미 친구" },
  { value: "relationship_open", label: "천천히 알아갈 인연" },
];

const PACE_OPTIONS = CONVERSATION_PACE_OPTIONS.filter(
  (option) => option.value !== "balanced",
);
const TIME_OPTIONS = AVAILABLE_TIME_OPTIONS.filter(
  (option) => option.value !== "morning",
);

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
      <legend className="px-1 text-base font-bold text-neutral-900">{title}</legend>
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
        최소 {min}개, 최대 {max}개를 골라주세요.
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
  // 기존 스키마 호환을 위해 분위기는 기본값으로 유지하되, 가입 화면에서는 묻지 않습니다.
  const [moods] = useState<ConversationMood[]>(
    initialPreferences.conversation_moods.length > 0
      ? initialPreferences.conversation_moods
      : [CONVERSATION_MOOD_OPTIONS[0].value],
  );
  const [topics, setTopics] = useState<ConversationTopic[]>(
    initialPreferences.conversation_topics.slice(0, 5),
  );
  const [pace, setPace] = useState<ConversationPace | null>(
    initialPreferences.conversation_pace === "balanced"
      ? null
      : initialPreferences.conversation_pace,
  );
  // 소규모 단체방 기능은 별도 진입점에서 제공하고, 기본 대화 프로필은 1:1로 저장합니다.
  const groupSize = "one_to_one" as const;
  const [timeSlots, setTimeSlots] = useState<AvailableTimeSlot[]>(
    initialPreferences.available_time_slots.filter((slot) => slot !== "morning"),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialLoadFailed ? "대화 프로필을 불러오지 못했어요. 잠시 후 다시 시도해주세요." : null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isComplete = useMemo(
    () =>
      Boolean(goal) &&
      topics.length >= 3 &&
      topics.length <= 5 &&
      Boolean(pace) &&
      timeSlots.length >= 1,
    [goal, pace, timeSlots.length, topics.length],
  );

  function toggleTopic(value: ConversationTopic) {
    setErrorMessage(null);
    setTopics((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : current.length < 5
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
    if (isSubmitting || !isComplete || !goal || !pace) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const supabase = createClient();
    if (!supabase) {
      setErrorMessage("서비스 연결을 확인하지 못했어요. 잠시 후 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      router.replace("/login");
      router.refresh();
      return;
    }

    const { error } = await supabase.rpc("save_conversation_preferences", {
      p_conversation_goal: goal,
      p_conversation_moods: moods,
      p_conversation_topics: topics,
      p_conversation_pace: pace,
      p_preferred_group_size: groupSize,
      p_available_time_slots: timeSlots,
    });
    if (error) {
      setErrorMessage("대화 프로필을 저장하지 못했어요. 선택값을 확인하고 다시 시도해주세요.");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("고정 대화 프로필을 저장했어요.");
    window.setTimeout(() => {
      router.replace(successPath);
      router.refresh();
    }, 650);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <fieldset className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">관계 기대</legend>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          편안하게 시작하고 싶은 대화의 방향 하나를 골라주세요.
        </p>
        <div className="mt-4 space-y-2.5">
          {RELATIONSHIP_OPTIONS.map((option) => (
            <ChoiceCard key={option.value} label={option.label} selected={goal === option.value} disabled={isSubmitting} onClick={() => setGoal(option.value)} />
          ))}
        </div>
      </fieldset>

      <MultiChoiceSection
        title="관심사"
        description="공통점을 찾을 때 사용할 관심사를 골라주세요."
        options={CONVERSATION_TOPIC_OPTIONS}
        values={topics}
        min={3}
        max={5}
        disabled={isSubmitting}
        onToggle={toggleTopic}
      />

      <fieldset className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <legend className="px-1 text-base font-bold text-neutral-900">답장 스타일</legend>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {PACE_OPTIONS.map((option) => (
            <ChoiceCard key={option.value} label={option.value === "fast" ? "답장 빠른 편" : "천천히 보는 편"} selected={pace === option.value} disabled={isSubmitting} onClick={() => setPace(option.value)} />
          ))}
        </div>
      </fieldset>

      <MultiChoiceSection
        title="주로 대화 가능한 시간"
        description="여러 시간대를 골라도 괜찮아요."
        options={TIME_OPTIONS}
        values={timeSlots}
        min={1}
        max={3}
        disabled={isSubmitting}
        onToggle={toggleTimeSlot}
      />

      {errorMessage && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{errorMessage}</p>}
      {successMessage && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700">{successMessage}</p>}

      <ActionButton type="submit" disabled={!isComplete || isSubmitting} aria-label="고정 대화 프로필 저장하기">
        {isSubmitting ? "저장 중…" : successPath === "/match-preview" ? "저장하고 대화 제안 보기" : "대화 프로필 저장하기"}
      </ActionButton>
      {!isComplete && <p className="text-center text-xs leading-5 text-neutral-400">관계 기대, 관심사 3~5개, 답장 스타일, 시간대를 고르면 저장할 수 있어요.</p>}
    </form>
  );
}
