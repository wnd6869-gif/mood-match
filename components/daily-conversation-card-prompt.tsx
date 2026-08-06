"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DAILY_CONVERSATION_TOPICS, DAILY_CONVERSATION_TOPIC_LABELS, type DailyConversationCard, type DailyConversationTopic } from "@/lib/daily-conversation-card";

export default function DailyConversationCardPrompt({
  previousCard,
}: {
  previousCard: DailyConversationCard | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"choice" | "write">("choice");
  const [question, setQuestion] = useState("");
  const [topic, setTopic] = useState<DailyConversationTopic | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(action: "keep_previous" | "skip" | "save") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/daily-conversation-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, question, topic, customTopic }),
      });
      const data = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "오늘의 대화 카드를 저장하지 못했어요.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 rounded-[2rem] border border-coral-100 bg-coral-50/70 p-5 shadow-sm">
      <p className="text-xs font-bold text-coral-700">오늘의 대화 카드</p>
      {mode === "choice" ? (
        <>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">오늘은 어떤 이야기로 시작할까요?</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">하루 첫 방문에만 보여드려요. 지금 바쁘면 건너뛰어도 괜찮아요.</p>
          <div className="mt-4 grid gap-2">
            {previousCard && !previousCard.skipped && (
              <button type="button" disabled={busy} onClick={() => void save("keep_previous")} className="min-h-11 rounded-2xl bg-white px-4 text-left text-sm font-bold text-neutral-800 shadow-sm disabled:opacity-50">어제 내용 유지</button>
            )}
            <button type="button" disabled={busy} onClick={() => setMode("write")} className="min-h-11 rounded-2xl bg-neutral-900 px-4 text-sm font-bold text-white disabled:opacity-50">새로 작성하기</button>
            <button type="button" disabled={busy} onClick={() => void save("skip")} className="min-h-11 rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-600 disabled:opacity-50">오늘은 건너뛰기</button>
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-2 text-xl font-bold text-neutral-900">오늘의 대화 카드</h2>
          <label className="mt-4 block text-sm font-bold text-neutral-800">오늘 누가 물어봐주면 좋은 질문 <span className="font-medium text-neutral-400">(선택)</span>
            <textarea value={question} maxLength={160} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="요즘 제일 추천하고 싶은 거 하나는?" className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-coral-400" />
          </label>
          <p className="mt-4 text-sm font-bold text-neutral-800">오늘 꺼낼 수 있는 소재 <span className="font-medium text-neutral-400">(선택)</span></p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DAILY_CONVERSATION_TOPICS.map((value) => <button key={value} type="button" onClick={() => setTopic(value)} className={`min-h-10 rounded-xl px-3 text-xs font-bold ${topic === value ? "bg-coral-500 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"}`}>{DAILY_CONVERSATION_TOPIC_LABELS[value]}</button>)}
          </div>
          {topic === "custom" && <input value={customTopic} maxLength={60} onChange={(event) => setCustomTopic(event.target.value)} placeholder="직접 작성" className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-coral-400" />}
          <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={() => setMode("choice")} className="min-h-11 rounded-2xl border border-neutral-200 bg-white text-sm font-bold text-neutral-600">이전</button><button type="button" disabled={busy} onClick={() => void save("save")} className="min-h-11 rounded-2xl bg-neutral-900 text-sm font-bold text-white disabled:opacity-50">{busy ? "저장 중..." : "오늘 카드 저장"}</button></div>
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
