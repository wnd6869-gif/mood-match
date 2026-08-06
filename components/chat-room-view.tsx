"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import ChatRoomMenu from "@/components/chat-room-menu";
import MutualPhotoReveal from "@/components/mutual-photo-reveal";
import { ReportDialog } from "@/components/safety-actions";
import {
  formatMessageTime,
  getChatMessageFromRecord,
  type ChatMessage,
  type ConversationContext,
} from "@/lib/chat";
import type { PhotoRevealStatus } from "@/lib/photo-reveal";
import { createClient } from "@/lib/supabase/client";
import AvatarRenderer from "@/components/avatar-renderer";
import { isCharacterRecipe } from "@/lib/persona-record";

type ChatRoomViewProps = {
  currentUserId: string;
  context: ConversationContext;
  initialMessages: ChatMessage[];
  initialHasOlderMessages: boolean;
  initialOldestCursor: { createdAt: string; id: string } | null;
  initialPhotoRevealStatus: PhotoRevealStatus | null;
  initialOtherPhotoUrl: string | null;
};

type ChatApiResponse = {
  error?: string;
  message?: ChatMessage;
};

async function updateReadState(conversationId: string) {
  await fetch("/api/chats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "setting",
      conversationId,
      setting: "read",
    }),
  }).catch(() => null);
}

export default function ChatRoomView({
  currentUserId,
  context,
  initialMessages,
  initialHasOlderMessages,
  initialOldestCursor,
  initialPhotoRevealStatus,
  initialOtherPhotoUrl,
}: ChatRoomViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [hasOlderMessages, setHasOlderMessages] = useState(initialHasOlderMessages);
  const [oldestCursor, setOldestCursor] = useState(initialOldestCursor);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null,
  );
  const [reportedMessage, setReportedMessage] = useState<{
    messageId: string;
    senderId: string;
  } | null>(null);
  const [safetyFeedback, setSafetyFeedback] = useState<string | null>(
    null,
  );
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(
    supabase
      ? null
      : "실시간 연결을 준비하지 못했어요. 새로고침으로 확인해주세요.",
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const lastReadUpdateRef = useRef(0);
  const markRead = useCallback(() => {
    const now = Date.now();

    if (now - lastReadUpdateRef.current < 2000) {
      return;
    }

    lastReadUpdateRef.current = now;
    updateReadState(context.conversationId);
  }, [context.conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
    markRead();
  }, [markRead]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    // Postgres Changes is sufficient for the MVP. For larger concurrent
    // audiences, move message fan-out to private Broadcast channels.
    const channel = supabase
      .channel(`chat:${context.conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${context.conversationId}`,
        },
        (payload) => {
          const incoming = getChatMessageFromRecord(payload.new);

          if (!incoming) {
            return;
          }

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }

            return [...current, incoming];
          });

          const shouldFollow =
            isNearBottomRef.current ||
            incoming.senderId === currentUserId;

          if (shouldFollow) {
            window.requestAnimationFrame(() => {
              bottomRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            });
          }

          if (
            incoming.senderId !== currentUserId &&
            isNearBottomRef.current &&
            document.visibilityState === "visible"
          ) {
            markRead();
          }
        },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          setRealtimeMessage(null);
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeMessage(
            "실시간 연결이 불안정해요. 연결이 계속되지 않으면 새로고침해주세요.",
          );

          if (process.env.NODE_ENV === "development") {
            console.error("[chat-realtime]", status, error);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    context.conversationId,
    currentUserId,
    markRead,
    supabase,
  ]);

  const membersById = useMemo(
    () =>
      new Map(
        context.members.map((member) => [member.userId, member]),
      ),
    [context.members],
  );
  const roomTitle =
    context.conversationType === "group"
      ? (context.conversationTitle ?? "이름 없는 단체방")
      : context.otherPublicNickname;
  const roomSubtitle =
    context.conversationType === "group"
      ? `${context.members.length}명 · 소규모 단체방`
      : context.otherPersonaTitle;

  function handleScroll() {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    isNearBottomRef.current =
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      120;

    if (
      isNearBottomRef.current &&
      document.visibilityState === "visible"
    ) {
      markRead();
    }
  }

  async function loadOlderMessages() {
    if (!oldestCursor || isLoadingOlder) return;
    const container = scrollContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    const previousTop = container?.scrollTop ?? 0;
    setIsLoadingOlder(true);
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "history",
          conversationId: context.conversationId,
          cursor: oldestCursor,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        messages?: ChatMessage[];
        hasOlderMessages?: boolean;
        nextCursor?: { createdAt: string; id: string } | null;
        error?: string;
      } | null;
      if (!response.ok || !payload?.messages) {
        setErrorMessage(payload?.error ?? "이전 메시지를 불러오지 못했어요.");
        return;
      }
      const olderMessages = payload.messages;
      setMessages((current) => {
        const existing = new Set(current.map((message) => message.id));
        return [
          ...olderMessages.filter((message) => !existing.has(message.id)),
          ...current,
        ];
      });
      setHasOlderMessages(payload.hasOlderMessages === true);
      setOldestCursor(payload.nextCursor ?? null);
      window.requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = previousTop + (container.scrollHeight - previousHeight);
        }
      });
    } finally {
      setIsLoadingOlder(false);
    }
  }

  async function sendMessage() {
    const messageBody = draft.trim();

    if (!messageBody || isSending || context.isBlocked) {
      return;
    }

    if (messageBody.length > 1000) {
      setErrorMessage("메시지는 1000자 이하로 입력해주세요.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          conversationId: context.conversationId,
          message: messageBody,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | ChatApiResponse
        | null;

      if (!response.ok || !data?.message) {
        setErrorMessage(
          data?.error ??
            "메시지를 보내지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      setMessages((current) =>
        current.some((message) => message.id === data.message?.id)
          ? current
          : [...current, data.message as ChatMessage],
      );
      setDraft("");
      isNearBottomRef.current = true;
      window.requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    } catch {
      setErrorMessage(
        "네트워크 연결을 확인한 뒤 다시 시도해주세요.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AppShell className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col sm:h-[calc(100dvh-4rem)]">
      <header className="flex items-center gap-2 border-b border-neutral-200/80 pb-3">
        <BackLink
          href="/chats"
          ariaLabel="채팅 목록으로 돌아가기"
          label=""
        />
        {context.conversationType === "direct" && isCharacterRecipe(context.otherCharacterRecipe) && (
          <AvatarRenderer recipe={context.otherCharacterRecipe} size={40} shape="circle" className="size-10" alt="상대 캐릭터" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-neutral-900">{roomTitle}</h1>
          <p className="truncate text-xs font-semibold text-coral-600">{roomSubtitle}</p>
        </div>
        <ChatRoomMenu context={context} />
      </header>
      {realtimeMessage && (
        <p role="status" className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          {realtimeMessage}
        </p>
      )}
      {safetyFeedback && (
        <p role="status" className="mt-3 rounded-xl bg-coral-50 px-3 py-2 text-xs leading-5 text-coral-800">
          {safetyFeedback}
        </p>
      )}
      {context.conversationType === "direct" && (
        <MutualPhotoReveal
          conversationId={context.conversationId}
          otherNickname={context.otherPublicNickname}
          initialStatus={initialPhotoRevealStatus}
          initialPhotoUrl={initialOtherPhotoUrl}
        />
      )}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="mt-3 flex min-h-0 flex-1 flex-col overscroll-contain overflow-y-auto rounded-3xl bg-white px-3 py-4 shadow-sm"
        aria-live="polite"
      >
        {hasOlderMessages && (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={loadOlderMessages}
              disabled={isLoadingOlder}
              className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-50"
            >
              {isLoadingOlder ? "불러오는 중..." : "이전 메시지 보기"}
            </button>
          </div>
        )}
        <p className="mb-5 text-center text-[0.68rem] leading-5 text-neutral-400">
          최근 메시지 50개를 표시하고 있어요.
        </p>
        <div className="w-full space-y-3">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-coral-50 text-xl">
                ✦
              </span>
              <p className="mt-4 text-sm font-semibold text-neutral-700">
                가볍게 첫 인사를 건네보세요.
              </p>
            </div>
          )}

          {messages.map((message) => {
            if (message.messageType === "system") {
              return (
                <div
                  key={message.id}
                  className="py-2 text-center text-xs text-neutral-400"
                >
                  {message.deletedAt
                    ? "삭제된 시스템 메시지입니다."
                    : message.body}
                </div>
              );
            }

            const isMine = message.senderId === currentUserId;
            const sender = membersById.get(message.senderId);

            return (
              <div
                key={message.id}
                onContextMenu={(event) => {
                  if (!isMine && !message.deletedAt) {
                    event.preventDefault();
                    setReportedMessage({
                      messageId: message.id,
                      senderId: message.senderId,
                    });
                  }
                }}
                className={`flex items-end gap-2 ${
                  isMine ? "justify-end" : "justify-start"
                }`}
              >
                {!isMine && (
                  <div className="mb-1 flex shrink-0 flex-col items-center gap-1">
                    <span className="flex size-7 items-center justify-center rounded-full bg-coral-50 text-xs text-coral-600">
                      ✦
                    </span>
                    {context.conversationType === "group" && (
                      <span className="max-w-16 truncate text-[0.6rem] font-semibold text-neutral-500">
                        {sender?.publicNickname ?? "멤버"}
                      </span>
                    )}
                  </div>
                )}
                {isMine && (
                  <time
                    dateTime={message.createdAt}
                    className="mb-1 shrink-0 text-[0.65rem] text-neutral-400"
                  >
                    {formatMessageTime(message.createdAt)}
                  </time>
                )}
                <div
                  className={`max-w-[76%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                    isMine
                      ? "rounded-br-md bg-neutral-900 text-white"
                      : "rounded-bl-md bg-neutral-100 text-neutral-800"
                  }`}
                >
                  <p
                    className={`whitespace-pre-wrap break-words ${
                      message.deletedAt ? "italic opacity-60" : ""
                    }`}
                  >
                    {message.deletedAt
                      ? "삭제된 메시지입니다."
                      : message.body}
                  </p>
                </div>
                {!isMine && (
                  <div className="mb-1 flex shrink-0 flex-col items-start gap-1">
                    <button
                      type="button"
                      disabled={Boolean(message.deletedAt)}
                      aria-label="이 메시지 신고하기"
                      onClick={() =>
                        setReportedMessage({
                          messageId: message.id,
                          senderId: message.senderId,
                        })
                      }
                      className="flex size-7 cursor-pointer items-center justify-center rounded-full text-base text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <span aria-hidden="true">⋯</span>
                    </button>
                    <time
                      dateTime={message.createdAt}
                      className="text-[0.65rem] text-neutral-400"
                    >
                      {formatMessageTime(message.createdAt)}
                    </time>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 mt-3 shrink-0 rounded-3xl border border-neutral-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-lg">
        {context.isBlocked ? (
          <p className="py-2 text-center text-sm font-semibold text-neutral-500">
            현재 이 사용자와 메시지를 주고받을 수 없어요.
          </p>
        ) : (
          <div className="flex items-end gap-2">
            <label htmlFor="chat-message" className="sr-only">
              메시지 입력
            </label>
            <textarea
              id="chat-message"
              rows={1}
              maxLength={1000}
              disabled={isSending}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="메시지를 입력해주세요"
              className="max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-2xl bg-neutral-100 px-4 py-3 text-base leading-6 outline-none transition-colors placeholder:text-neutral-400 focus:bg-white focus:ring-2 focus:ring-coral-100 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              disabled={!draft.trim() || isSending}
              onClick={sendMessage}
              aria-label="메시지 전송"
              className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-coral-500 text-sm font-bold text-white transition-all hover:bg-coral-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              {isSending ? "…" : "전송"}
            </button>
          </div>
        )}

        <div className="mt-1 flex items-center justify-between px-1">
          {errorMessage ? (
            <p role="alert" className="text-xs text-red-600">
              {errorMessage}
            </p>
          ) : (
            <span />
          )}
          <span className="shrink-0 text-[0.65rem] text-neutral-400">
            {draft.length}/1000
          </span>
        </div>
      </div>

      <ReportDialog
        isOpen={reportedMessage !== null}
        targetUserId={
          reportedMessage?.senderId ??
          context.otherUserId ??
          currentUserId
        }
        conversationId={context.conversationId}
        messageId={reportedMessage?.messageId}
        onClose={() => setReportedMessage(null)}
        onSuccess={setSafetyFeedback}
      />
    </AppShell>
  );
}
