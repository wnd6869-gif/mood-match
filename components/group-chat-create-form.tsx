"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton, ActionLink } from "@/components/action";
import type { GroupChatCandidate } from "@/lib/chat";

type GroupChatCreateFormProps = {
  candidates: GroupChatCandidate[];
};

type CreateGroupResponse = {
  conversationId?: string;
  error?: string;
};

export default function GroupChatCreateForm({
  candidates,
}: GroupChatCreateFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleMember(userId: string) {
    if (isSubmitting) {
      return;
    }

    setSelectedIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      if (current.length >= 5) {
        setErrorMessage("한 방에는 나를 포함해 최대 6명까지 참여할 수 있어요.");
        return current;
      }

      setErrorMessage(null);
      return [...current, userId];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedTitle = title.trim();

    if (normalizedTitle.length < 2 || normalizedTitle.length > 30) {
      setErrorMessage("방 이름은 2자 이상 30자 이하로 입력해주세요.");
      return;
    }

    if (selectedIds.length < 2 || selectedIds.length > 5) {
      setErrorMessage("함께할 멤버를 2명 이상 5명 이하로 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create-group",
          groupTitle: normalizedTitle,
          memberIds: selectedIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | CreateGroupResponse
        | null;

      if (!response.ok || !data?.conversationId) {
        setErrorMessage(
          data?.error ??
            "단체방을 만들지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      router.push(`/chats/${data.conversationId}`);
      router.refresh();
    } catch {
      setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (candidates.length < 2) {
    return (
      <section className="mt-7 rounded-3xl border border-neutral-200/80 bg-white px-5 py-10 text-center shadow-sm">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-coral-50 text-xl">
          ☁
        </span>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">
          함께할 연결이 조금 더 필요해요
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          서로 인사를 수락했고 소규모 단체방을 허용한 사용자가 최소 2명
          있어야 해요.
        </p>
        <ActionLink
          href="/discover"
          className="mt-6"
          ariaLabel="함께 대화할 캐릭터 둘러보기"
        >
          캐릭터 둘러보기
        </ActionLink>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-5">
      <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <label
          htmlFor="group-title"
          className="text-base font-bold text-neutral-900"
        >
          방 이름
        </label>
        <input
          id="group-title"
          type="text"
          minLength={2}
          maxLength={30}
          required
          disabled={isSubmitting}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="예: 늦은 밤 음악 이야기"
          className="mt-3 min-h-14 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-base outline-none transition-colors placeholder:text-neutral-400 focus:border-coral-300 focus:ring-2 focus:ring-coral-100 disabled:cursor-not-allowed disabled:bg-neutral-100"
        />
        <p className="mt-2 text-right text-xs text-neutral-400">
          {title.length}/30
        </p>
      </section>

      <section className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              함께할 멤버
            </h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              2~5명을 선택해주세요. 방을 만든 나까지 함께 참여해요.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-coral-50 px-3 py-1 text-xs font-bold text-coral-700">
            총 {selectedIds.length + 1}명
          </span>
        </div>

        <div className="mt-4 space-y-2.5">
          {candidates.map((candidate) => {
            const isSelected = selectedIds.includes(candidate.userId);
            const isAtLimit = selectedIds.length >= 5 && !isSelected;

            return (
              <label
                key={candidate.userId}
                className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                  isSelected
                    ? "border-coral-300 bg-coral-50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                } ${
                  isAtLimit || isSubmitting
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isSubmitting || isAtLimit}
                  onChange={() => toggleMember(candidate.userId)}
                  className="size-5 accent-coral-500"
                />
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-coral-600 shadow-sm">
                  ✦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-neutral-900">
                    {candidate.publicNickname}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-coral-600">
                    {candidate.personaTitle}
                  </span>
                  {candidate.moodKeywords.length > 0 && (
                    <span className="mt-1 block truncate text-[0.68rem] text-neutral-400">
                      {candidate.moodKeywords.slice(0, 3).join(" · ")}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-neutral-100 px-4 py-3 text-xs leading-5 text-neutral-600">
        누군가 나가도 남은 멤버의 방과 대화는 계속 유지돼요. 방장이
        나가면 가장 오래 참여한 멤버에게 자동으로 방장이 넘어가요.
      </section>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <ActionButton
        type="submit"
        disabled={
          isSubmitting ||
          title.trim().length < 2 ||
          selectedIds.length < 2
        }
      >
        {isSubmitting
          ? "단체방 만드는 중..."
          : `${selectedIds.length + 1}명 단체방 만들기`}
      </ActionButton>
    </form>
  );
}
