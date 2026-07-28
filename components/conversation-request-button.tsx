"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import type {
  ConversationRequestDirection,
  ConversationRequestStatus,
} from "@/lib/conversation-request";
import type { PreferredGroupSize } from "@/lib/public-chat-profile";

type ConversationRequestButtonProps = {
  targetUserId: string;
  targetNickname: string;
  preferredGroupSize: PreferredGroupSize | null;
  requestStatus: ConversationRequestStatus | null;
  requestDirection: ConversationRequestDirection | null;
};

type ApiResponse = {
  error?: string;
  message?: string;
  code?: string;
};

export default function ConversationRequestButton({
  targetUserId,
  targetNickname,
  preferredGroupSize,
  requestStatus,
  requestDirection,
}: ConversationRequestButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [introMessage, setIntroMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showReceivedLink, setShowReceivedLink] = useState(false);

  const canReceiveOneToOne =
    preferredGroupSize === "one_to_one" ||
    preferredGroupSize === "both";

  async function handleSend() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setShowReceivedLink(false);

    try {
      const response = await fetch("/api/conversation-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          targetUserId,
          message: introMessage,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!response.ok) {
        setFeedback(
          data?.error ??
            "인사를 보내지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        setShowReceivedLink(data?.code === "reverse_pending");
        return;
      }

      setFeedback(data?.message ?? "가볍게 인사를 보냈어요.");
      setIsOpen(false);
      router.refresh();
    } catch {
      setFeedback(
        "네트워크 연결을 확인한 뒤 다시 시도해주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (requestStatus === "accepted") {
    return (
      <div>
        <ActionButton disabled aria-label="이미 대화가 열림">
          대화가 열렸어요
        </ActionButton>
      </div>
    );
  }

  if (requestStatus === "pending") {
    if (requestDirection === "received") {
      return (
        <div className="space-y-3">
          <p className="rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-800">
            이 캐릭터가 먼저 인사를 건넸어요.
          </p>
          <Link
            href="/requests?tab=received"
            className="flex min-h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3.5 text-base font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
          >
            받은 인사 확인하기
          </Link>
        </div>
      );
    }

    return (
      <div>
        <ActionButton disabled aria-label="이미 인사를 보냄">
          인사를 보냈어요
        </ActionButton>
        <p className="mt-2 text-center text-xs text-neutral-400">
          보낸 인사 화면에서 상태를 확인할 수 있어요.
        </p>
      </div>
    );
  }

  if (!canReceiveOneToOne) {
    return (
      <div>
        <ActionButton disabled aria-label="현재 1대1 대화 시작 불가">
          지금은 1:1 대화를 받지 않아요
        </ActionButton>
      </div>
    );
  }

  return (
    <div>
      <ActionButton
        onClick={() => {
          setFeedback(null);
          setShowReceivedLink(false);
          setIsOpen(true);
        }}
        aria-label={`${targetNickname}님에게 가볍게 대화 걸기`}
      >
        대화 걸기
      </ActionButton>

      {feedback && !isOpen && (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-800"
        >
          {feedback}
        </p>
      )}

      {showReceivedLink && !isOpen && (
        <Link
          href="/requests?tab=received"
          className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700"
        >
          받은 인사로 이동
        </Link>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="conversation-request-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 px-3 pt-12 backdrop-blur-[2px] sm:items-center"
        >
          <button
            type="button"
            aria-label="대화 걸기 창 닫기"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!isSubmitting) {
                setIsOpen(false);
              }
            }}
          />
          <section className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-7 shadow-xl sm:rounded-[2rem]">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200 sm:hidden" />
            <div className="mt-4 flex items-start justify-between gap-4 sm:mt-0">
              <div>
                <p className="text-xs font-semibold text-coral-600">
                  가벼운 1:1 대화
                </p>
                <h2
                  id="conversation-request-title"
                  className="mt-1 text-xl font-bold text-neutral-900"
                >
                  {targetNickname}님과 이야기해볼까요?
                </h2>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                aria-label="대화 걸기 창 닫기"
                onClick={() => setIsOpen(false)}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed"
              >
                <span aria-hidden="true" className="text-xl">
                  ×
                </span>
              </button>
            </div>

            <p className="mt-3 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-6 text-coral-800">
              가벼운 인사부터 시작해보세요. 상대가 답하면 대화가 열려요.
            </p>

            <label htmlFor="conversation-intro" className="mt-5 block">
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-neutral-800">
                  첫 인사 <span className="text-neutral-400">(선택)</span>
                </span>
                <span className="text-xs font-medium text-neutral-400">
                  {introMessage.length}/120
                </span>
              </span>
              <textarea
                id="conversation-intro"
                rows={4}
                maxLength={120}
                disabled={isSubmitting}
                value={introMessage}
                onChange={(event) => setIntroMessage(event.target.value)}
                placeholder="비슷한 분위기라 가볍게 이야기해보고 싶어요."
                className="mt-3 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-base leading-6 outline-none transition-colors placeholder:text-neutral-400 focus:border-coral-400 focus:ring-2 focus:ring-coral-100 disabled:bg-neutral-100"
              />
            </label>

            {feedback && (
              <p
                role="alert"
                className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
              >
                {feedback}
              </p>
            )}

            {showReceivedLink && (
              <Link
                href="/requests?tab=received"
                className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700"
              >
                받은 인사로 이동
              </Link>
            )}

            <div className="mt-5 space-y-3">
              <ActionButton
                onClick={handleSend}
                disabled={isSubmitting}
                aria-label={`${targetNickname}님에게 첫 인사 보내기`}
              >
                {isSubmitting ? "보내는 중..." : "인사 보내기"}
              </ActionButton>
              <ActionButton
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
              >
                취소
              </ActionButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
