"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReportDialog } from "@/components/safety-actions";
import type { DirectConversationContext } from "@/lib/chat";

type ApiResponse = {
  error?: string;
  message?: string;
};

async function readApiResponse(response: Response) {
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

export default function ChatRoomMenu({
  context,
}: {
  context: DirectConversationContext;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(context.isMuted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  async function callChatApi(payload: Record<string, unknown>) {
    return readApiResponse(
      await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: context.conversationId,
          ...payload,
        }),
      }),
    );
  }

  async function updateSetting(
    setting: "mute" | "unmute" | "hide" | "leave",
  ) {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await callChatApi({ action: "setting", setting });

      if (setting === "mute" || setting === "unmute") {
        const nextMuted = setting === "mute";
        setIsMuted(nextMuted);
        setFeedback(
          nextMuted ? "채팅 알림을 껐어요." : "채팅 알림을 켰어요.",
        );
      } else {
        router.replace("/chats");
        router.refresh();
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "요청을 처리하지 못했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBlock() {
    if (
      isSubmitting ||
      !window.confirm(
        "차단하면 서로의 공개 프로필이 보이지 않고, 새로운 대화 신청과 메시지 전송이 제한돼요.",
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await readApiResponse(
        await fetch("/api/safety", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "block",
            targetUserId: context.otherUserId,
          }),
        }),
      );
      router.replace("/chats");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "사용자를 차단하지 못했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="채팅방 메뉴 열기"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-xl text-neutral-600 transition-colors hover:bg-neutral-100 active:bg-neutral-200"
      >
        <span aria-hidden="true">⋮</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-30 w-60 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
          <Link
            href={`/discover/${context.otherUserId}`}
            className="flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            상대 공개 프로필 보기
          </Link>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => updateSetting(isMuted ? "unmute" : "mute")}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMuted ? "알림 켜기" : "알림 끄기"}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => updateSetting("hide")}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            채팅방 숨기기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setShowReport(true);
              setIsOpen(false);
            }}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            신고하기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleBlock}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            차단하기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (
                window.confirm(
                  "채팅방을 나가면 다시 메시지를 보낼 수 없어요. 나갈까요?",
                )
              ) {
                updateSetting("leave");
              }
            }}
            className="flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            채팅방 나가기
          </button>
        </div>
      )}

      {feedback && (
        <p className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-2xl bg-neutral-900 px-4 py-3 text-center text-sm text-white shadow-lg">
          {feedback}
        </p>
      )}

      <ReportDialog
        isOpen={showReport}
        targetUserId={context.otherUserId}
        conversationId={context.conversationId}
        onClose={() => setShowReport(false)}
        onSuccess={setFeedback}
      />
    </div>
  );
}
