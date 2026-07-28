"use client";

import { useState } from "react";
import type { BlockedUser } from "@/lib/safety";
import { formatSafetyDate } from "@/lib/safety";

export default function BlockedUsersList({
  initialUsers,
}: {
  initialUsers: BlockedUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [submittingUserId, setSubmittingUserId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUnblock(user: BlockedUser) {
    if (
      submittingUserId ||
      !window.confirm(
        `${user.publicNickname}님의 차단을 해제할까요? 이전 채팅방은 자동으로 다시 표시되지 않아요.`,
      )
    ) {
      return;
    }

    setSubmittingUserId(user.userId);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unblock",
          targetUserId: user.userId,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setErrorMessage(
          data?.error ??
            "차단을 해제하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      setUsers((current) =>
        current.filter((item) => item.userId !== user.userId),
      );
    } catch {
      setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setSubmittingUserId(null);
    }
  }

  if (users.length === 0) {
    return (
      <section className="mt-6 rounded-3xl border border-neutral-200/80 bg-white px-5 py-12 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
          ✓
        </span>
        <h2 className="mt-5 text-xl font-bold text-neutral-900">
          차단한 사용자가 없어요
        </h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          차단한 사용자가 생기면 이곳에서 관리할 수 있어요.
        </p>
      </section>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {errorMessage && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}
      {users.map((user) => (
        <article
          key={user.userId}
          className="rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
              ◌
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-neutral-900">
                {user.publicNickname}
              </h2>
              <p className="mt-0.5 truncate text-xs font-semibold text-coral-600">
                {user.personaTitle}
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                {formatSafetyDate(user.blockedAt)} 차단
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submittingUserId !== null}
            onClick={() => handleUnblock(user)}
            className="mt-4 min-h-11 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submittingUserId === user.userId
              ? "해제 중..."
              : "차단 해제"}
          </button>
        </article>
      ))}
    </div>
  );
}
