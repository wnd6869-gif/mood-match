"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import {
  formatConversationRequestDate,
  getConversationRequestStatusText,
  getConversationStartReasonLabel,
  type ConversationRequestListItem,
} from "@/lib/conversation-request";

type RequestsManagerProps = {
  initialItems: ConversationRequestListItem[];
  initialTab: "received" | "sent";
};

type ApiResponse = { error?: string; message?: string; conversationId?: string };

export default function RequestsManager({ initialItems, initialTab }: RequestsManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"received" | "sent">(initialTab);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [replyingItem, setReplyingItem] = useState<ConversationRequestListItem | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const items = initialItems.filter((item) => item.direction === tab);
  const receivedCount = initialItems.filter((item) => item.direction === "received").length;
  const sentCount = initialItems.filter((item) => item.direction === "sent").length;

  async function decline(requestId: string) {
    if (processingId) return;
    setProcessingId(requestId);
    setFeedback(null);
    try {
      const result = await fetch("/api/conversation-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", requestId, response: "declined" }),
      });
      const data = (await result.json().catch(() => null)) as ApiResponse | null;
      if (!result.ok) { setFeedback(data?.error ?? "요청을 처리하지 못했어요."); return; }
      setFeedback("이번 요청은 정중히 넘겼어요.");
      router.refresh();
    } catch { setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요."); }
    finally { setProcessingId(null); }
  }

  async function cancel(requestId: string) {
    if (processingId) return;
    setProcessingId(requestId);
    setFeedback(null);
    try {
      const result = await fetch("/api/conversation-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", requestId }),
      });
      const data = (await result.json().catch(() => null)) as ApiResponse | null;
      if (!result.ok) { setFeedback(data?.error ?? "요청을 취소하지 못했어요."); return; }
      setFeedback(data?.message ?? "보낸 요청을 취소했어요.");
      router.refresh();
    } catch { setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요."); }
    finally { setProcessingId(null); }
  }

  function openReply(item: ConversationRequestListItem) {
    const prompt = item.message ? `안녕하세요! ${item.message.slice(0, 42)} 저도 이야기 나눠보고 싶어요.` : "안녕하세요! 저도 가볍게 이야기 나눠보고 싶어요.";
    setReplyingItem(item);
    setReplyMessage(prompt.slice(0, 120));
    setFeedback(null);
  }

  async function acceptAndReply() {
    if (!replyingItem || processingId || !replyMessage.trim()) return;
    setProcessingId(replyingItem.requestId);
    try {
      const result = await fetch("/api/conversation-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_and_reply", requestId: replyingItem.requestId, replyMessage }),
      });
      const data = (await result.json().catch(() => null)) as ApiResponse | null;
      if (!result.ok || !data?.conversationId) { setFeedback(data?.error ?? "대화를 열지 못했어요."); return; }
      router.push(`/chats/${data.conversationId}`);
    } catch { setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요."); }
    finally { setProcessingId(null); }
  }

  return (
    <div className="mt-7">
      <div role="tablist" aria-label="대화 요청 구분" className="grid grid-cols-2 rounded-2xl bg-neutral-100 p-1">
        <button type="button" role="tab" aria-selected={tab === "received"} onClick={() => setTab("received")} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${tab === "received" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>받은 요청 {receivedCount}</button>
        <button type="button" role="tab" aria-selected={tab === "sent"} onClick={() => setTab("sent")} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${tab === "sent" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"}`}>보낸 요청 {sentCount}</button>
      </div>
      {feedback && !replyingItem && <p role="status" className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-800">{feedback}</p>}
      {items.length === 0 ? <section className="mt-5 rounded-3xl border border-neutral-200/80 bg-white px-5 py-10 text-center shadow-sm"><h2 className="text-lg font-bold text-neutral-900">아직 {tab === "received" ? "받은" : "보낸"} 대화 요청이 없어요</h2><p className="mt-2 text-sm leading-6 text-neutral-500">캐릭터를 둘러보고 부담 없이 대화를 시작해보세요.</p><Link href="/discover" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-coral-50 px-4 text-sm font-semibold text-coral-700">캐릭터 둘러보기</Link></section> : <div className="mt-5 space-y-4">{items.map((item) => {
        const isProcessing = processingId === item.requestId;
        const reasonLabel = getConversationStartReasonLabel(item.startReason ?? item.dailyCardSnapshot);
        return <article key={item.requestId} className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate text-lg font-bold text-neutral-900">{item.otherPublicNickname}</h2><p className="mt-1 truncate text-sm font-semibold text-coral-600">{item.otherPersonaTitle}</p></div><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">{item.status === "pending" ? "확인 필요" : getConversationRequestStatusText(item.status, item.direction)}</span></div>
          {reasonLabel && <section className="mt-4 rounded-2xl bg-coral-50 px-4 py-3"><p className="text-xs font-bold text-coral-700">이유가 있어 말을 걸었어요</p><p className="mt-1 text-sm font-semibold leading-5 text-neutral-800">{reasonLabel}</p></section>}
          {item.message && <p className="mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm leading-6 text-neutral-700">“{item.message}”</p>}
          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-neutral-400"><span>{getConversationRequestStatusText(item.status, item.direction)}</span><time dateTime={item.createdAt}>{formatConversationRequestDate(item.createdAt)}</time></div>
          <Link href={`/discover/${item.otherUserId}`} className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600">상대 프로필 보기</Link>
          {tab === "received" && item.status === "pending" && <div className="mt-3 grid grid-cols-2 gap-2.5"><ActionButton variant="secondary" disabled={Boolean(processingId)} onClick={() => void decline(item.requestId)}>{isProcessing ? "처리 중..." : "이번엔 넘기기"}</ActionButton><ActionButton disabled={Boolean(processingId)} onClick={() => openReply(item)}>수락하고 답장하기</ActionButton></div>}
          {tab === "sent" && item.status === "pending" && <div className="mt-3"><ActionButton variant="secondary" disabled={Boolean(processingId)} onClick={() => void cancel(item.requestId)}>{isProcessing ? "취소 중..." : "보낸 요청 취소"}</ActionButton></div>}
          {item.status === "accepted" && <Link href="/chats" className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-neutral-900 text-sm font-bold text-white">대화로 이동</Link>}
        </article>;
      })}</div>}
      {replyingItem && <div role="dialog" aria-modal="true" aria-labelledby="reply-request-title" className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/35 px-3 pt-12 sm:items-center"><button type="button" aria-label="답장 닫기" className="absolute inset-0" onClick={() => !processingId && setReplyingItem(null)} /><section className="relative z-10 w-full max-w-md rounded-t-[2rem] bg-white p-5 pb-7 shadow-xl sm:rounded-[2rem]"><div className="mx-auto h-1.5 w-10 rounded-full bg-neutral-200 sm:hidden" /><p className="mt-4 text-xs font-bold text-coral-600">대화를 열며 답장하기</p><h2 id="reply-request-title" className="mt-1 text-xl font-bold text-neutral-900">@{replyingItem.otherPublicNickname}에게 첫 답장을 보내세요</h2><p className="mt-2 text-sm leading-6 text-neutral-600">수락과 함께 답장을 보내므로 빈 대화방이 만들어지지 않아요.</p><div className="mt-4 flex flex-wrap gap-2">{["안녕하세요! 저도 이야기 나눠보고 싶어요.", "좋아요. 오늘 이야기부터 가볍게 시작해볼까요?", "반가워요! 보내주신 이야기, 저도 궁금했어요."].map((reply) => <button key={reply} type="button" onClick={() => setReplyMessage(reply)} className="rounded-full bg-coral-50 px-3 py-2 text-xs font-semibold text-coral-800">{reply}</button>)}</div><textarea value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} maxLength={120} rows={4} className="mt-4 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 outline-none focus:border-coral-400" />{feedback && <p role="alert" className="mt-3 text-sm text-red-700">{feedback}</p>}<div className="mt-5 grid grid-cols-2 gap-3"><ActionButton variant="secondary" disabled={Boolean(processingId)} onClick={() => setReplyingItem(null)}>취소</ActionButton><ActionButton disabled={Boolean(processingId) || !replyMessage.trim()} onClick={() => void acceptAndReply()}>{processingId ? "여는 중..." : "수락하고 답장하기"}</ActionButton></div></section></div>}
    </div>
  );
}
