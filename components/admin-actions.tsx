"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  MODERATION_STATUS_LABELS,
  MODERATION_STATUSES,
  type AdminRole,
  type ModerationStatus,
} from "@/lib/admin-shared";

type ApiResult = { error?: string; message?: string };

async function callAdminApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as
    | ApiResult
    | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "관리자 작업을 처리하지 못했어요.");
  }

  return data;
}

const ROLE_RANK: Record<AdminRole, number> = {
  moderator: 1,
  admin: 2,
  super_admin: 3,
};

export function UserModerationActions({
  targetUserId,
  currentStatus,
  isPublic,
  actorRole,
  targetAdminRole,
  isSelf,
}: {
  targetUserId: string;
  currentStatus: ModerationStatus;
  isPublic: boolean;
  actorRole: AdminRole;
  targetAdminRole: AdminRole | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canAct =
    !isSelf &&
    (!targetAdminRole ||
      ROLE_RANK[actorRole] > ROLE_RANK[targetAdminRole]);

  async function updateStatus() {
    if (isSubmitting || !canAct) {
      return;
    }

    if (!reason.trim()) {
      setFeedback("상태 변경 사유를 입력해주세요.");
      return;
    }

    if (
      !window.confirm(
        `${MODERATION_STATUS_LABELS[status]} 상태로 변경할까요? 사용자 기능에 즉시 반영됩니다.`,
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const data = await callAdminApi({
        action: "updateUserStatus",
        targetUserId,
        status,
        reason,
        suspendedUntil:
          status === "suspended" ? suspendedUntil : null,
      });
      setFeedback(data?.message ?? "사용자 상태를 변경했어요.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "상태 변경에 실패했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function disableProfile() {
    if (isSubmitting || !canAct || !isPublic) {
      return;
    }

    if (!reason.trim()) {
      setFeedback("공개 프로필 비활성화 사유를 입력해주세요.");
      return;
    }

    if (!window.confirm("이 사용자의 공개 프로필을 비활성화할까요?")) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const data = await callAdminApi({
        action: "disablePublicProfile",
        targetUserId,
        reason,
      });
      setFeedback(data?.message ?? "공개 프로필을 비활성화했어요.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "프로필 비활성화에 실패했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-5">
      <h3 className="text-base font-bold text-neutral-900">운영 조치</h3>
      {!canAct && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          자기 자신 또는 같거나 높은 등급의 관리자는 제재할 수 없어요.
        </p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-neutral-500">
            사용자 상태
          </span>
          <select
            value={status}
            disabled={!canAct || isSubmitting}
            onChange={(event) =>
              setStatus(event.target.value as ModerationStatus)
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-coral-400 disabled:bg-neutral-100"
          >
            {MODERATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {MODERATION_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        {status === "suspended" && (
          <label className="block">
            <span className="text-xs font-semibold text-neutral-500">
              정지 종료 시간
            </span>
            <input
              type="datetime-local"
              value={suspendedUntil}
              disabled={!canAct || isSubmitting}
              onChange={(event) => setSuspendedUntil(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-coral-400 disabled:bg-neutral-100"
            />
          </label>
        )}
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold text-neutral-500">
          조치 사유
        </span>
        <textarea
          rows={3}
          maxLength={500}
          value={reason}
          disabled={!canAct || isSubmitting}
          onChange={(event) => setReason(event.target.value)}
          placeholder="운영 조치 근거를 입력하세요."
          className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-coral-400 disabled:bg-neutral-100"
        />
      </label>

      {feedback && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700"
        >
          {feedback}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canAct || isSubmitting}
          onClick={updateStatus}
          className="min-h-11 cursor-pointer rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {isSubmitting ? "처리 중..." : "상태 변경"}
        </button>
        <button
          type="button"
          disabled={!canAct || isSubmitting || !isPublic}
          onClick={disableProfile}
          className="min-h-11 cursor-pointer rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          공개 프로필 비활성화
        </button>
      </div>
    </section>
  );
}

export function ReportAdminActions({
  reportId,
  currentStatus,
  currentNote,
}: {
  reportId: string;
  currentStatus: string;
  currentNote: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [adminNote, setAdminNote] = useState(currentNote);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    if (!adminNote.trim()) {
      setFeedback("처리 근거가 되는 관리자 메모를 입력해주세요.");
      return;
    }

    if (!window.confirm("신고 처리 상태와 관리자 메모를 저장할까요?")) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const data = await callAdminApi({
        action: "updateReportStatus",
        targetReportId: reportId,
        status,
        adminNote,
      });
      setFeedback(data?.message ?? "신고 상태를 변경했어요.");
      router.refresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "신고 처리에 실패했어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h3 className="text-base font-bold text-neutral-900">신고 처리</h3>
      <label className="mt-4 block">
        <span className="text-xs font-semibold text-neutral-500">
          처리 상태
        </span>
        <select
          value={status}
          disabled={isSubmitting}
          onChange={(event) => setStatus(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-coral-400 disabled:bg-neutral-100"
        >
          <option value="pending">접수됨</option>
          <option value="reviewing">검토 중</option>
          <option value="resolved">처리 완료</option>
          <option value="dismissed">검토 종료</option>
        </select>
      </label>
      <label className="mt-3 block">
        <span className="text-xs font-semibold text-neutral-500">
          관리자 메모
        </span>
        <textarea
          rows={4}
          maxLength={1000}
          value={adminNote}
          disabled={isSubmitting}
          onChange={(event) => setAdminNote(event.target.value)}
          className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-coral-400 disabled:bg-neutral-100"
        />
      </label>
      {feedback && (
        <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          {feedback}
        </p>
      )}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleSubmit}
        className="mt-4 min-h-11 cursor-pointer rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {isSubmitting ? "저장 중..." : "처리 내용 저장"}
      </button>
    </section>
  );
}
