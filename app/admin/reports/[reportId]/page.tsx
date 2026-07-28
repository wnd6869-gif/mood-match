import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ReportAdminActions,
  UserModerationActions,
} from "@/components/admin-actions";
import {
  asRecord,
  asRecords,
  asString,
  formatAdminDate,
  isAdminRole,
  isModerationStatus,
  requireAdmin,
} from "@/lib/admin";
import {
  getReportReasonLabel,
  isReportReason,
  REPORT_STATUS_LABELS,
  type ReportStatus,
} from "@/lib/safety";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;

  if (!UUID_PATTERN.test(reportId)) {
    notFound();
  }

  const { supabase, role, userId } = await requireAdmin();
  const { data, error } = await supabase.rpc(
    "admin_get_report_detail",
    { target_report_id: reportId },
  );
  const detail = asRecord(data);
  const report = asRecord(detail.report);
  const reporter = asRecord(detail.reporter);
  const reported = asRecord(detail.reported);
  const messages = asRecords(detail.messageContext);

  if (error || Object.keys(report).length === 0) {
    notFound();
  }

  const reportStatus =
    typeof report.status === "string" &&
    report.status in REPORT_STATUS_LABELS
      ? (report.status as ReportStatus)
      : "pending";
  const moderationStatus = isModerationStatus(
    reported.moderationStatus,
  )
    ? reported.moderationStatus
    : "active";
  const targetAdminRole = isAdminRole(reported.adminRole)
    ? reported.adminRole
    : null;

  return (
    <div>
      <Link
        href="/admin/reports"
        className="text-sm font-semibold text-neutral-500 hover:text-neutral-900"
      >
        ← 신고 목록
      </Link>
      <header className="mt-5">
        <p className="text-sm font-semibold text-coral-600">
          신고 {reportId.slice(0, 8)}
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          신고 상세
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          {formatAdminDate(report.createdAt)} ·{" "}
          {REPORT_STATUS_LABELS[reportStatus]}
        </p>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="font-bold">신고 내용</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail
                label="사유"
                value={
                  isReportReason(report.reason)
                    ? getReportReasonLabel(report.reason)
                    : "기타"
                }
              />
              <Detail
                label="관련 자료"
                value={[
                  report.conversationId ? "대화방" : "",
                  report.messageId ? "메시지" : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "프로필 신고"}
              />
              <Detail
                label="신고자"
                value={`${asString(reporter.nickname, "비공개 사용자")} (${asString(reporter.id).slice(0, 8)})`}
              />
              <Detail
                label="신고 대상"
                value={`${asString(reported.nickname, "비공개 사용자")} (${asString(reported.id).slice(0, 8)})`}
              />
            </dl>
            <div className="mt-5 rounded-xl bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold text-neutral-400">
                추가 설명
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                {asString(report.details, "추가 설명 없음")}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h3 className="font-bold">관련 메시지 컨텍스트</h3>
            <p className="mt-1 text-xs text-neutral-400">
              신고 메시지 앞뒤 최대 5개만 표시합니다.
            </p>
            <div className="mt-4 space-y-2">
              {messages.length === 0 && (
                <p className="text-sm text-neutral-400">
                  연결된 메시지가 없습니다.
                </p>
              )}
              {messages.map((message) => (
                <article
                  key={asString(message.id)}
                  className={`rounded-xl border px-4 py-3 ${
                    message.is_reported === true
                      ? "border-red-300 bg-red-50"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <div className="flex justify-between gap-3 text-xs text-neutral-400">
                    <span>발신자 {asString(message.sender_id).slice(0, 8)}</span>
                    <time>{formatAdminDate(message.created_at)}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700">
                    {asString(message.body)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <ReportAdminActions
            reportId={reportId}
            currentStatus={reportStatus}
            currentNote={asString(report.adminNote)}
          />
          <UserModerationActions
            targetUserId={asString(reported.id)}
            currentStatus={moderationStatus}
            isPublic={reported.isPublic === true}
            actorRole={role}
            targetAdminRole={targetAdminRole}
            isSelf={asString(reported.id) === userId}
          />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-neutral-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-neutral-700">
        {value}
      </dd>
    </div>
  );
}
