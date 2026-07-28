"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import {
  formatConversationRequestDate,
  getConversationRequestStatusText,
  type ConversationRequestListItem,
} from "@/lib/conversation-request";

type RequestsManagerProps = {
  initialItems: ConversationRequestListItem[];
  initialTab: "received" | "sent";
};

type ApiResponse = {
  error?: string;
  message?: string;
  conversationId?: string;
};

export default function RequestsManager({
  initialItems,
  initialTab,
}: RequestsManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">(initialTab);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const items = initialItems.filter((item) => item.direction === tab);
  const receivedCount = initialItems.filter(
    (item) => item.direction === "received",
  ).length;
  const sentCount = initialItems.filter(
    (item) => item.direction === "sent",
  ).length;

  async function mutateRequest(
    requestId: string,
    action: "respond" | "cancel",
    response?: "accepted" | "declined",
  ) {
    if (processingId) {
      return;
    }

    setProcessingId(requestId);
    setFeedback(null);

    try {
      const result = await fetch("/api/conversation-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          requestId,
          response,
        }),
      });
      const data = (await result.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!result.ok) {
        setFeedback(
          data?.error ??
            "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      setFeedback(data?.message ?? "요청을 처리했어요.");
      router.refresh();
    } catch {
      setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setProcessingId(null);
    }
  }

  async function startChat(requestId: string) {
    if (processingId) {
      return;
    }

    setProcessingId(requestId);
    setFeedback(null);

    try {
      const result = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          requestId,
        }),
      });
      const data = (await result.json().catch(() => null)) as
        | ApiResponse
        | null;

      if (!result.ok || !data?.conversationId) {
        setFeedback(
          data?.error ??
            "채팅방을 열지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      router.push(`/chats/${data.conversationId}`);
    } catch {
      setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="mt-7">
      <div
        role="tablist"
        aria-label="대화 요청 구분"
        className="grid grid-cols-2 rounded-2xl bg-neutral-100 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "received"}
          onClick={() => setTab("received")}
          className={`min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold transition-all ${
            tab === "received"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500"
          }`}
        >
          받은 요청 {receivedCount}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sent"}
          onClick={() => setTab("sent")}
          className={`min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold transition-all ${
            tab === "sent"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500"
          }`}
        >
          보낸 요청 {sentCount}
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-800"
        >
          {feedback}
        </p>
      )}

      {items.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-neutral-200/80 bg-white px-5 py-10 text-center shadow-sm">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
            ↔
          </span>
          <h2 className="mt-4 text-lg font-bold text-neutral-900">
            {tab === "received"
              ? "아직 받은 대화 신청이 없어요"
              : "아직 보낸 대화 신청이 없어요"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            캐릭터를 둘러보고 편하게 대화를 시작해보세요.
          </p>
          <Link
            href="/discover"
            className="mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-coral-50 px-4 text-sm font-semibold text-coral-700"
          >
            캐릭터 둘러보기
          </Link>
        </section>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const isProcessing = processingId === item.requestId;

            return (
              <article
                key={item.requestId}
                className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-neutral-900">
                      {item.otherPublicNickname}
                    </h2>
                    <p className="mt-1 truncate text-sm font-semibold text-coral-600">
                      {item.otherPersonaTitle}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "accepted"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "pending"
                          ? "bg-coral-50 text-coral-700"
                          : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {item.status === "pending"
                      ? tab === "received"
                        ? "답변 필요"
                        : "대기 중"
                      : item.status === "accepted"
                        ? "수락됨"
                        : item.status === "declined"
                          ? "연결 안 됨"
                          : "취소됨"}
                  </span>
                </div>

                {item.message && (
                  <p className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                    “{item.message}”
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-neutral-400">
                  <span>
                    {getConversationRequestStatusText(
                      item.status,
                      item.direction,
                    )}
                  </span>
                  <time dateTime={item.createdAt}>
                    {formatConversationRequestDate(item.createdAt)}
                  </time>
                </div>

                <Link
                  href={`/discover/${item.otherUserId}`}
                  className="mt-4 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
                >
                  상대 프로필 보기
                </Link>

                {item.status === "accepted" && (
                  <div className="mt-3">
                    <ActionButton
                      disabled={Boolean(processingId)}
                      onClick={() => startChat(item.requestId)}
                    >
                      {isProcessing
                        ? "채팅방 여는 중..."
                        : "채팅 시작하기"}
                    </ActionButton>
                  </div>
                )}

                {tab === "received" && item.status === "pending" && (
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <ActionButton
                      variant="secondary"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        mutateRequest(
                          item.requestId,
                          "respond",
                          "declined",
                        )
                      }
                    >
                      {isProcessing ? "처리 중..." : "거절"}
                    </ActionButton>
                    <ActionButton
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        mutateRequest(
                          item.requestId,
                          "respond",
                          "accepted",
                        )
                      }
                    >
                      {isProcessing ? "처리 중..." : "수락"}
                    </ActionButton>
                  </div>
                )}

                {tab === "sent" && item.status === "pending" && (
                  <div className="mt-3">
                    <ActionButton
                      variant="secondary"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        mutateRequest(item.requestId, "cancel")
                      }
                    >
                      {isProcessing ? "취소 중..." : "신청 취소"}
                    </ActionButton>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
