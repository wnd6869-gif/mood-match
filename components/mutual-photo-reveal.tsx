"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import StoredImagePreview from "@/components/stored-image-preview";
import {
  getPhotoRevealStatusFromRecord,
  type PhotoRevealStatus,
} from "@/lib/photo-reveal";
import { createClient } from "@/lib/supabase/client";

type MutualPhotoRevealProps = {
  conversationId: string;
  otherNickname: string;
  initialStatus: PhotoRevealStatus | null;
  initialPhotoUrl: string | null;
};

type PhotoRevealApiResponse = {
  error?: string;
  status?: unknown;
  photoUrl?: string | null;
};

export default function MutualPhotoReveal({
  conversationId,
  otherNickname,
  initialStatus,
  initialPhotoUrl,
}: MutualPhotoRevealProps) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState(initialStatus);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    const response = await fetch("/api/chats", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "photo-status",
        conversationId,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | PhotoRevealApiResponse
      | null;
    const nextStatus = getPhotoRevealStatusFromRecord(data?.status);

    if (!response.ok || !nextStatus) {
      return;
    }

    setStatus(nextStatus);
    setPhotoUrl(
      typeof data?.photoUrl === "string" ? data.photoUrl : null,
    );
  }, [conversationId]);

  useEffect(() => {
    if (!supabase || !status) {
      return;
    }

    const channel = supabase
      .channel(`photo-consent:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photo_reveal_consents",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void refreshStatus();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, refreshStatus, status, supabase]);

  if (!status) {
    return null;
  }

  const involvesMutualSetting =
    status.ownPhotoVisibility === "mutual" ||
    status.otherPhotoVisibility === "mutual";

  if (!involvesMutualSetting) {
    return null;
  }

  async function updateConsent(nextConsented: boolean) {
    if (isUpdating) {
      return;
    }

    setIsUpdating(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "photo-consent",
          conversationId,
          consent: nextConsented,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | PhotoRevealApiResponse
        | null;
      const nextStatus = getPhotoRevealStatusFromRecord(data?.status);

      if (!response.ok || !nextStatus) {
        setFeedback(
          data?.error ??
            "사진 공개 동의를 변경하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      setStatus(nextStatus);
      setPhotoUrl(
        typeof data?.photoUrl === "string" ? data.photoUrl : null,
      );
      setFeedback(
        nextConsented
          ? nextStatus.revealed
            ? "서로 동의해 실제 사진이 공개됐어요."
            : "동의했어요. 상대가 동의하면 실제 사진이 공개돼요."
          : "사진 공개 동의를 철회했어요. 실제 사진을 다시 숨겼어요.",
      );
    } catch {
      setFeedback("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsUpdating(false);
    }
  }

  if (!status.available) {
    return (
      <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-bold text-amber-900">
          서로 동의 사진 공개
        </p>
        <p className="mt-1 text-xs leading-5 text-amber-800">
          두 사람 모두 공개 프로필의 사진 범위를 ‘서로 동의하면 실제
          사진 공개’로 선택해야 사용할 수 있어요.
        </p>
        <Link
          href="/profile/public"
          className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-white px-3 text-xs font-bold text-amber-900 shadow-sm"
        >
          내 사진 공개 설정 확인
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-3 rounded-2xl border border-coral-100 bg-coral-50 p-3">
      <div className="flex items-center gap-3">
        {status.revealed ? (
          <StoredImagePreview
            src={photoUrl}
            variant="avatar"
            className="size-14 shrink-0 shadow-sm"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
            ◌
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900">
            {status.revealed
              ? `${otherNickname}님의 실제 사진이 공개됐어요`
              : status.ownConsented
                ? "상대의 동의를 기다리고 있어요"
                : status.otherConsented
                  ? "상대가 사진 공개에 동의했어요"
                  : "서로 동의하면 실제 사진 공개"}
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">
            {status.revealed
              ? "두 사람 중 한 명이 철회하면 즉시 다시 숨겨져요."
              : "두 사람 모두 동의한 뒤에만 서로의 원본 사진이 보여요."}
          </p>
        </div>
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => void updateConsent(!status.ownConsented)}
          className={`min-h-10 shrink-0 cursor-pointer rounded-xl px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            status.ownConsented
              ? "border border-neutral-200 bg-white text-neutral-600"
              : "bg-neutral-900 text-white"
          }`}
        >
          {isUpdating
            ? "처리 중"
            : status.ownConsented
              ? "동의 철회"
              : "나도 동의"}
        </button>
      </div>
      {feedback && (
        <p
          role="status"
          className="mt-2 rounded-xl bg-white/80 px-3 py-2 text-xs leading-5 text-neutral-700"
        >
          {feedback}
        </p>
      )}
    </section>
  );
}
