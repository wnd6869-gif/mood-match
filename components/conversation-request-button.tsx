"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/action";
import type {
  ConversationRequestDirection,
  ConversationRequestStatus,
  ConversationStartReason,
} from "@/lib/conversation-request";
import type { PreferredGroupSize } from "@/lib/public-chat-profile";

type ConversationRequestButtonProps = {
  targetUserId: string;
  targetNickname: string;
  preferredGroupSize: PreferredGroupSize | null;
  requestStatus: ConversationRequestStatus | null;
  requestDirection: ConversationRequestDirection | null;
  todayQuestion?: string | null;
  todayTopic?: string | null;
  commonTopics?: string[];
  sharedTimeSlots?: string[];
  personaTitle?: string | null;
  compact?: boolean;
};

type ReasonOption = {
  id: string;
  kind: ConversationStartReason["kind"];
  value?: string;
  label: string;
  prompts: string[];
};

type ApiResponse = { error?: string; message?: string; code?: string };

export default function ConversationRequestButton({
  targetUserId,
  targetNickname,
  preferredGroupSize,
  requestStatus,
  requestDirection,
  todayQuestion = null,
  todayTopic = null,
  commonTopics = [],
  sharedTimeSlots = [],
  personaTitle = null,
  compact = false,
}: ConversationRequestButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [introMessage, setIntroMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showReceivedLink, setShowReceivedLink] = useState(false);

  const canReceiveOneToOne =
    preferredGroupSize === "one_to_one" || preferredGroupSize === "both";
  const reasonOptions = useMemo<ReasonOption[]>(() => {
    const options: ReasonOption[] = [];
    if (todayQuestion) {
      options.push({
        id: "daily-question",
        kind: "daily_question",
        label: "오늘의 질문",
        prompts: [
          `${todayQuestion} 궁금해요.`,
          `오늘 질문을 보고 말을 걸어봐요. ${todayQuestion}`,
          `저도 이 질문에 답해보고 싶어요. ${todayQuestion}`,
        ],
      });
    }
    if (todayTopic) {
      options.push({
        id: "daily-topic",
        kind: "daily_topic",
        label: `오늘의 소재: ${todayTopic}`,
        prompts: [
          `오늘 ${todayTopic} 이야기를 가볍게 나눠보고 싶어요.`,
          `${todayTopic} 중에서 요즘 가장 추천하고 싶은 건 무엇인가요?`,
          `오늘의 소재가 ${todayTopic}라서 반가워요. 최근 이야기를 들려주세요.`,
        ],
      });
    }
    commonTopics.slice(0, 2).forEach((topic) => {
      options.push({
        id: `topic-${topic}`,
        kind: "common_interest",
        value: topic,
        label: `공통 관심사: ${topic}`,
        prompts: [
          `우리 둘 다 ${topic} 좋아하네요. 최근 즐긴 것 하나만 추천해줘요.`,
          `${topic} 이야기를 좋아하신다고 봤어요. 요즘 어떤 걸 즐기고 계세요?`,
          `${topic}으로 가볍게 이야기 시작해볼까요? 최근 관심 가는 게 궁금해요.`,
        ],
      });
    });
    sharedTimeSlots.slice(0, 1).forEach((slot) => {
      options.push({
        id: `time-${slot}`,
        kind: "shared_time",
        value: slot,
        label: `대화 선호 시간대가 같아요: ${slot}`,
        prompts: [
          `${slot}에 대화하는 편이라니 반가워요. 이 시간에는 보통 뭐 하세요?`,
          `저도 ${slot}에 천천히 이야기하는 편이에요. 오늘 하루는 어땠어요?`,
          `${slot}에 가볍게 이야기 나눠볼까요? 요즘 이 시간에 자주 하는 일이 있나요?`,
        ],
      });
    });
    if (personaTitle) {
      options.push({
        id: "character",
        kind: "character",
        label: `${personaTitle} 캐릭터가 궁금해요`,
        prompts: [
          `${personaTitle} 캐릭터가 인상적이에요. 가볍게 이야기 시작해볼까요?`,
          `${personaTitle} 캐릭터 결과, 본인도 조금 닮았다고 생각해요?`,
          `캐릭터 분위기가 편안해 보여요. 오늘은 어떤 이야기 꺼내고 싶으세요?`,
        ],
      });
    }
    return options.slice(0, 5);
  }, [commonTopics, personaTitle, sharedTimeSlots, todayQuestion, todayTopic]);
  const selectedReason =
    reasonOptions.find((option) => option.id === selectedReasonId) ??
    reasonOptions[0] ??
    null;

  function openSheet() {
    const initialReason = reasonOptions[0] ?? null;
    setFeedback(null);
    setShowReceivedLink(false);
    setSelectedReasonId(initialReason?.id ?? null);
    setIntroMessage(initialReason?.prompts[0] ?? "안녕하세요. 부담 없이 가볍게 이야기 나눠보고 싶어요.");
    setIsOpen(true);
  }

  function selectReason(option: ReasonOption) {
    setSelectedReasonId(option.id);
    setIntroMessage(option.prompts[0]);
  }

  async function handleSend() {
    if (isSubmitting || !selectedReason || !introMessage.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);
    setShowReceivedLink(false);
    try {
      const response = await fetch("/api/conversation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          targetUserId,
          message: introMessage,
          reasonKind: selectedReason.kind,
          reasonValue: selectedReason.value ?? null,
        }),
      });
      const data = (await response.json().catch(() => null)) as ApiResponse | null;
      if (!response.ok) {
        setFeedback(data?.error ?? "대화 요청을 보내지 못했어요. 잠시 후 다시 시도해주세요.");
        setShowReceivedLink(data?.code === "reverse_pending");
        return;
      }
      setFeedback(data?.message ?? "대화 요청을 보냈어요.");
      setIsOpen(false);
      router.refresh();
    } catch {
      setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (requestStatus === "accepted") {
    return <ActionButton disabled>대화가 열렸어요</ActionButton>;
  }
  if (requestStatus === "pending") {
    if (requestDirection === "received") {
      return (
        <div className="space-y-3">
          <p className="rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-800">
            이 캐릭터가 먼저 대화를 요청했어요.
          </p>
          <Link href="/requests?tab=received" className="flex min-h-14 items-center justify-center rounded-2xl bg-neutral-900 px-5 py-3.5 text-base font-semibold text-white">
            받은 대화 요청 확인하기
          </Link>
        </div>
      );
    }
    return (
      <div>
        <ActionButton disabled>대화 요청을 보냈어요</ActionButton>
        <p className="mt-2 text-center text-xs text-neutral-400">보낸 요청 화면에서 상태를 확인할 수 있어요.</p>
      </div>
    );
  }
  if (!canReceiveOneToOne) return <ActionButton disabled>지금은 1:1 대화를 받지 않아요</ActionButton>;

  return (
    <div>
      <ActionButton onClick={openSheet}>{compact ? "대화 요청" : "대화 걸기"}</ActionButton>
      {feedback && !isOpen && <p role="status" className="mt-3 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-800">{feedback}</p>}
      {showReceivedLink && !isOpen && <Link href="/requests?tab=received" className="mt-3 flex min-h-12 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700">받은 요청으로 이동</Link>}
      {isOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="conversation-request-title" className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 px-3 pt-12 backdrop-blur-[2px] sm:items-center">
          <button type="button" aria-label="대화 요청 닫기" className="absolute inset-0 cursor-default" onClick={() => !isSubmitting && setIsOpen(false)} />
          <section className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-7 shadow-xl sm:rounded-[2rem]">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200 sm:hidden" />
            <p className="mt-4 text-xs font-bold text-coral-600">대화를 시작하는 이유</p>
            <h2 id="conversation-request-title" className="mt-1 text-xl font-bold text-neutral-900">@{targetNickname}에게 가볍게 말을 걸어볼까요?</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">서로의 사진 없이, 지금 나눌 수 있는 소재를 골라 첫 인사를 보내요.</p>
            <div className="mt-4 grid gap-2">
              {reasonOptions.map((option) => <button key={option.id} type="button" disabled={isSubmitting} onClick={() => selectReason(option)} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${selectedReason?.id === option.id ? "border-coral-300 bg-coral-50 text-coral-900" : "border-neutral-200 bg-white text-neutral-700"}`}>{option.label}</button>)}
            </div>
            <section className="mt-5">
              <p className="text-sm font-bold text-neutral-800">첫 인사</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">추천 문구를 그대로 보내거나, 내 말로 고쳐 보낼 수 있어요.</p>
              <div className="mt-3 grid gap-2">
                {(selectedReason?.prompts ?? []).map((prompt) => (
                  <button key={prompt} type="button" disabled={isSubmitting} onClick={() => setIntroMessage(prompt)} className={`rounded-2xl border px-3 py-2.5 text-left text-sm leading-5 ${introMessage === prompt ? "border-coral-300 bg-coral-50 text-coral-900" : "border-neutral-200 bg-white text-neutral-700"}`}>
                    {prompt}
                  </button>
                ))}
                <button type="button" disabled={isSubmitting} onClick={() => setIntroMessage("")} className="justify-self-start text-xs font-bold text-neutral-500 underline underline-offset-4">직접 작성하기</button>
              </div>
              <textarea value={introMessage} onChange={(event) => setIntroMessage(event.target.value)} rows={4} maxLength={120} disabled={isSubmitting} className="mt-3 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-base leading-6 outline-none focus:border-coral-400 focus:ring-2 focus:ring-coral-100" />
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-400"><span>추천 질문 그대로 보내기 또는 직접 수정</span><span>{introMessage.length}/120</span></div>
            </section>
            {feedback && <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{feedback}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3"><ActionButton variant="secondary" disabled={isSubmitting} onClick={() => setIsOpen(false)}>취소</ActionButton><ActionButton disabled={isSubmitting || !introMessage.trim() || !selectedReason} onClick={handleSend}>{isSubmitting ? "보내는 중..." : "대화 요청 보내기"}</ActionButton></div>
          </section>
        </div>
      )}
    </div>
  );
}
