"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import {
  REPORT_REASON_OPTIONS,
  type ReportReason,
} from "@/lib/safety";

type ApiResponse = {
  error?: string;
  message?: string;
};

async function callSafetyApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/safety", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as
    | ApiResponse
    | null;

  if (!response.ok) {
    throw new Error(
      data?.error ??
        "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
    );
  }

  return data;
}

export function ReportDialog({
  isOpen,
  targetUserId,
  conversationId,
  messageId,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  targetUserId: string;
  conversationId?: string;
  messageId?: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  const [reason, setReason] =
    useState<ReportReason>("abusive_language");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const data = await callSafetyApi({
        action: "report",
        targetUserId,
        reason,
        details,
        conversationId: conversationId ?? null,
        messageId: messageId ?? null,
      });
      setDetails("");
      onSuccess?.(
        data?.message ??
          "신고가 접수되었어요. 검토 후 필요한 조치를 진행할게요.",
      );
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "신고를 접수하지 못했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-report-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 px-3 pt-12 backdrop-blur-[2px] sm:items-center"
    >
      <button
        type="button"
        aria-label="신고 창 닫기"
        disabled={isSubmitting}
        onClick={onClose}
        className="absolute inset-0 cursor-default disabled:cursor-not-allowed"
      />
      <section className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-7 shadow-xl sm:rounded-[2rem]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200 sm:hidden" />
        <h2
          id="safety-report-title"
          className="mt-4 text-xl font-bold text-neutral-900 sm:mt-0"
        >
          {messageId ? "메시지 신고" : "사용자 신고"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          신고 사실과 내용은 상대에게 알려지지 않아요.
        </p>

        <label htmlFor="safety-report-reason" className="mt-5 block">
          <span className="text-sm font-semibold text-neutral-800">
            신고 사유
          </span>
          <select
            id="safety-report-reason"
            disabled={isSubmitting}
            value={reason}
            onChange={(event) =>
              setReason(event.target.value as ReportReason)
            }
            className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none transition-colors focus:border-coral-400 disabled:cursor-not-allowed disabled:bg-neutral-100"
          >
            {REPORT_REASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="safety-report-details" className="mt-4 block">
          <span className="flex items-center justify-between gap-3 text-sm font-semibold text-neutral-800">
            추가 설명
            <span className="text-xs font-medium text-neutral-400">
              {details.length}/500
            </span>
          </span>
          <textarea
            id="safety-report-details"
            rows={4}
            maxLength={500}
            disabled={isSubmitting}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="검토에 도움이 될 내용을 적어주세요. (선택)"
            className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-3 py-3 text-sm leading-6 outline-none transition-colors focus:border-coral-400 disabled:bg-neutral-100"
          />
        </label>

        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-5 space-y-3">
          <ActionButton
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "접수 중..." : "신고 접수하기"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            취소
          </ActionButton>
        </div>
      </section>
    </div>
  );
}

export default function ProfileSafetyMenu({
  targetUserId,
  targetNickname,
}: {
  targetUserId: string;
  targetNickname: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleBlock() {
    if (
      isBlocking ||
      !window.confirm(
        "차단하면 서로의 공개 프로필이 보이지 않고, 새로운 대화 신청과 메시지 전송이 제한돼요.",
      )
    ) {
      return;
    }

    setIsBlocking(true);
    setFeedback(null);

    try {
      await callSafetyApi({ action: "block", targetUserId });
      router.replace("/discover");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "사용자를 차단하지 못했어요.",
      );
    } finally {
      setIsBlocking(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`${targetNickname} 프로필 안전 메뉴 열기`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-white text-xl text-neutral-600 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
      >
        <span aria-hidden="true">⋮</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-30 w-44 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
          <button
            type="button"
            disabled={isBlocking}
            onClick={() => {
              setIsOpen(false);
              setShowReport(true);
            }}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            신고하기
          </button>
          <button
            type="button"
            disabled={isBlocking}
            onClick={handleBlock}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isBlocking ? "차단 중..." : "차단하기"}
          </button>
        </div>
      )}

      {feedback && (
        <p
          role="alert"
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-neutral-900 px-4 py-3 text-center text-sm text-white shadow-lg"
        >
          {feedback}
        </p>
      )}

      <ReportDialog
        isOpen={showReport}
        targetUserId={targetUserId}
        onClose={() => setShowReport(false)}
        onSuccess={setFeedback}
      />
    </div>
  );
}
