"use client";

import { useState } from "react";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
} from "@/lib/public-chat-profile";

type FilterValues = {
  goal: string | null;
  mood: string | null;
  topic: string | null;
  time: string | null;
  oneToOneOnly: boolean;
};

const SELECT_CLASS =
  "min-h-12 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-coral-400";

export default function DiscoverFilterSheet({
  tab,
  initialValues,
  hasFilters,
}: {
  tab: string;
  initialValues: FilterValues;
  hasFilters: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-700 shadow-sm"
      >
        <span aria-hidden="true">☷</span>
        필터
        {hasFilters && (
          <span className="size-2 rounded-full bg-coral-500" />
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="discover-filter-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 px-3 pt-16 backdrop-blur-[2px]"
        >
          <button
            type="button"
            aria-label="필터 닫기"
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
          />
          <form
            method="get"
            className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] shadow-xl"
          >
            <input type="hidden" name="tab" value={tab} />
            <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200" />
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-coral-600">
                  조건 좁히기
                </p>
                <h2
                  id="discover-filter-title"
                  className="mt-1 text-xl font-bold text-neutral-900"
                >
                  원하는 대화 상대
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-500"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label>
                <span className="mb-2 block text-xs font-bold text-neutral-500">
                  대화 목적
                </span>
                <select
                  name="goal"
                  defaultValue={initialValues.goal ?? ""}
                  className={SELECT_CLASS}
                >
                  <option value="">전체</option>
                  {CONVERSATION_GOAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-neutral-500">
                  분위기
                </span>
                <select
                  name="mood"
                  defaultValue={initialValues.mood ?? ""}
                  className={SELECT_CLASS}
                >
                  <option value="">전체</option>
                  {CONVERSATION_MOOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-neutral-500">
                  관심 주제
                </span>
                <select
                  name="topic"
                  defaultValue={initialValues.topic ?? ""}
                  className={SELECT_CLASS}
                >
                  <option value="">전체</option>
                  {CONVERSATION_TOPIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-neutral-500">
                  접속 시간
                </span>
                <select
                  name="time"
                  defaultValue={initialValues.time ?? ""}
                  className={SELECT_CLASS}
                >
                  <option value="">전체</option>
                  {AVAILABLE_TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 flex min-h-12 items-center gap-3 rounded-xl bg-neutral-50 px-4 text-sm font-semibold text-neutral-700">
              <input
                type="checkbox"
                name="oneToOne"
                value="true"
                defaultChecked={initialValues.oneToOneOnly}
                className="size-5 accent-coral-500"
              />
              1:1 대화 가능한 캐릭터만
            </label>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <a
                href={`/discover?tab=${encodeURIComponent(tab)}`}
                className="flex min-h-13 items-center justify-center rounded-2xl border border-neutral-200 text-sm font-bold text-neutral-600"
              >
                초기화
              </a>
              <button
                type="submit"
                className="min-h-13 rounded-2xl bg-neutral-900 px-4 text-sm font-bold text-white"
              >
                조건 적용
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
