export const REPORT_REASON_OPTIONS = [
  { value: "abusive_language", label: "불쾌하거나 공격적인 언행" },
  { value: "sexual_content", label: "성적인 콘텐츠 또는 메시지" },
  { value: "impersonation", label: "사칭" },
  { value: "spam", label: "광고 또는 도배" },
  { value: "personal_info_request", label: "개인정보 요구" },
  { value: "harassment", label: "괴롭힘" },
  { value: "underage_suspicion", label: "미성년자 의심" },
  { value: "other", label: "기타" },
] as const;

export type ReportReason =
  (typeof REPORT_REASON_OPTIONS)[number]["value"];

export const REPORT_STATUS_LABELS = {
  pending: "접수됨",
  reviewing: "검토 중",
  resolved: "처리 완료",
  dismissed: "검토 종료",
} as const;

export type ReportStatus = keyof typeof REPORT_STATUS_LABELS;

export type BlockedUser = {
  userId: string;
  publicNickname: string;
  personaTitle: string;
  blockedAt: string;
};

export type SubmittedReport = {
  reportId: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
};

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASON_OPTIONS.some((option) => option.value === value);
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return (
    typeof value === "string" &&
    Object.hasOwn(REPORT_STATUS_LABELS, value)
  );
}

export function getReportReasonLabel(reason: ReportReason) {
  return (
    REPORT_REASON_OPTIONS.find((option) => option.value === reason)
      ?.label ?? "기타"
  );
}

export function getBlockedUserFromRecord(
  value: unknown,
): BlockedUser | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.user_id !== "string" ||
    typeof record.blocked_at !== "string"
  ) {
    return null;
  }

  return {
    userId: record.user_id,
    publicNickname:
      typeof record.public_nickname === "string"
        ? record.public_nickname
        : "비공개 사용자",
    personaTitle:
      typeof record.persona_title === "string"
        ? record.persona_title
        : "페르소나 정보 없음",
    blockedAt: record.blocked_at,
  };
}

export function getSubmittedReportFromRecord(
  value: unknown,
): SubmittedReport | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.report_id !== "string" ||
    !isReportReason(record.reason) ||
    !isReportStatus(record.status) ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  return {
    reportId: record.report_id,
    reason: record.reason,
    status: record.status,
    createdAt: record.created_at,
  };
}

export function formatSafetyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
