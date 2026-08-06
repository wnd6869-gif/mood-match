"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import CharacterAvatar from "@/components/character-avatar";
import ConversationRequestButton from "@/components/conversation-request-button";
import type { CharacterRecipe } from "@/lib/character-casting";
import type {
  ConversationRequestDirection,
  ConversationRequestStatus,
} from "@/lib/conversation-request";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  findOptionLabel,
  type PreferredGroupSize,
} from "@/lib/public-chat-profile";

const SWIPE_THRESHOLD = 80;

export type DiscoverSwipeDeckItem = {
  userId: string;
  publicNickname: string;
  personaTitle: string;
  animalTypes: readonly { name: string; score?: number }[];
  characterRecipe: CharacterRecipe | null;
  conversationGoal: string | null;
  conversationTopics: string[];
  availableTimeSlots: string[];
  preferredGroupSize: PreferredGroupSize | null;
  requestStatus: ConversationRequestStatus | null;
  requestDirection: ConversationRequestDirection | null;
  score: number | null;
};

type DiscoverSwipeDeckProps = {
  items: DiscoverSwipeDeckItem[];
  showRecommendationScore: boolean;
  showSetupHint: boolean;
};

function nextIndex(index: number, count: number) {
  return Math.min(index + 1, count);
}

export default function DiscoverSwipeDeck({
  items,
  showRecommendationScore,
  showSetupHint,
}: DiscoverSwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const activeItem = items[currentIndex] ?? null;
  const nextItem = items[currentIndex + 1] ?? null;

  function moveToNext() {
    setDragOffset(0);
    setCurrentIndex((index) => nextIndex(index, items.length));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    pointerStartX.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (pointerStartX.current === null) {
      return;
    }

    setDragOffset(Math.max(-120, Math.min(120, event.clientX - pointerStartX.current)));
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLElement>) {
    if (pointerStartX.current === null) {
      return;
    }

    const distance = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    setIsDragging(false);
    setDragOffset(0);

    if (Math.abs(distance) >= SWIPE_THRESHOLD) {
      moveToNext();
    }
  }

  if (!activeItem) {
    return (
      <section className="mt-6 rounded-[2rem] bg-white px-5 py-12 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral-50 text-2xl">
          ◌
        </span>
        <h2 className="mt-5 text-xl font-bold text-neutral-900">
          오늘의 캐릭터를 모두 둘러봤어요.
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          필터를 바꾸거나 잠시 뒤 새로운 캐릭터를 다시 만나보세요.
        </p>
        <Link
          href="/discover"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700"
        >
          처음부터 다시 보기
        </Link>
      </section>
    );
  }

  const goalLabel = findOptionLabel(
    activeItem.conversationGoal,
    CONVERSATION_GOAL_OPTIONS,
  );
  const topicLabels = activeItem.conversationTopics
    .slice(0, 3)
    .map(
      (value) =>
        findOptionLabel(value, CONVERSATION_TOPIC_OPTIONS) ?? value,
    );
  const timeLabels = activeItem.availableTimeSlots
    .slice(0, 2)
    .map((value) => findOptionLabel(value, AVAILABLE_TIME_OPTIONS) ?? value);

  return (
    <section className="mt-6" aria-label="캐릭터 한 장씩 둘러보기">
      <div className="mb-3 flex items-center justify-between px-1 text-xs font-semibold text-neutral-400">
        <span>한 장씩 가볍게 둘러보세요</span>
        <span aria-live="polite">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      <div className="relative min-h-[33rem]">
        {nextItem && (
          <div className="absolute inset-x-3 top-3 h-[calc(100%-0.75rem)] rounded-[2rem] bg-[#f2efea] shadow-sm" />
        )}
        <article
          className="relative overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_42px_rgba(23,23,23,0.1)]"
          style={{
            transform: `translateX(${dragOffset}px) rotate(${dragOffset / 24}deg)`,
            transition: isDragging ? "none" : "transform 180ms ease-out",
            touchAction: "pan-y",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <Link href={`/discover/${activeItem.userId}`} className="block">
            <CharacterAvatar
              animalTypes={activeItem.animalTypes}
              personaTitle={activeItem.personaTitle}
              recipe={activeItem.characterRecipe ?? undefined}
              variant="card"
              className="aspect-[5/4]"
            />
          </Link>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {showRecommendationScore && activeItem.score !== null && (
                  <span className="inline-flex rounded-full bg-[#eef7f2] px-2.5 py-1 text-[0.65rem] font-bold text-[#35705a]">
                    추천 {activeItem.score}%
                  </span>
                )}
                {showSetupHint && (
                  <span className="inline-flex rounded-full bg-coral-50 px-2.5 py-1 text-[0.65rem] font-bold text-coral-700">
                    취향 설정 후 맞춤 추천
                  </span>
                )}
                <Link href={`/discover/${activeItem.userId}`}>
                  <h2 className="mt-2 truncate text-xl font-bold text-neutral-900">
                    @{activeItem.publicNickname}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-coral-600">
                    {activeItem.personaTitle}
                  </p>
                </Link>
              </div>
              <Link
                href={`/discover/${activeItem.userId}`}
                className="shrink-0 rounded-full border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600"
              >
                자세히 보기
              </Link>
            </div>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              {goalLabel ?? "가벼운 대화를 나누고 싶어요."}
            </p>
            <p className="mt-2 text-xs leading-5 text-neutral-400">
              {topicLabels.length > 0
                ? topicLabels.join(" · ")
                : "관심 주제는 대화하며 알아가요"}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {timeLabels.length > 0
                ? `대화 선호: ${timeLabels.join(" · ")}`
                : "대화 선호 시간 미설정"}
            </p>
            <div className="mt-5">
              <ConversationRequestButton
                targetUserId={activeItem.userId}
                targetNickname={activeItem.publicNickname}
                preferredGroupSize={activeItem.preferredGroupSize}
                requestStatus={activeItem.requestStatus}
                requestDirection={activeItem.requestDirection}
              />
            </div>
          </div>
        </article>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={moveToNext}
          className="min-h-13 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-50"
        >
          건너뛰기
        </button>
        <Link
          href={`/discover/${activeItem.userId}`}
          className="flex min-h-13 items-center justify-center rounded-2xl bg-neutral-900 px-4 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
        >
          이 캐릭터 알아보기
        </Link>
      </div>
      <p className="mt-3 text-center text-xs text-neutral-400">
        카드를 좌우로 밀어 다음 캐릭터를 볼 수도 있어요.
      </p>
    </section>
  );
}
