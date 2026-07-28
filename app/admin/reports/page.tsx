import Link from "next/link";
import {
  asRecords,
  asString,
  formatAdminDate,
  requireAdmin,
} from "@/lib/admin";
import {
  getReportReasonLabel,
  isReportReason,
  REPORT_STATUS_LABELS,
  type ReportStatus,
} from "@/lib/safety";

const REPORT_FILTERS = [
  { value: "", label: "전체" },
  { value: "pending", label: "접수됨" },
  { value: "reviewing", label: "검토 중" },
  { value: "resolved", label: "처리 완료" },
  { value: "dismissed", label: "검토 종료" },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
  }>;
}) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const rawStatus = Array.isArray(query.status)
    ? query.status[0]
    : query.status;
  const status = REPORT_FILTERS.some(
    (filter) => filter.value === rawStatus,
  )
    ? rawStatus ?? ""
    : "";
  const { data, error } = await supabase.rpc("admin_list_reports", {
    status_filter: status || null,
  });
  const reports = asRecords(data);

  return (
    <div>
      <header>
        <p className="text-sm font-semibold text-coral-600">신고 운영</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          신고 관리
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          신고자 정보는 운영 화면 밖으로 노출하지 않습니다.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="신고 상태 필터">
        {REPORT_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={
              filter.value
                ? `/admin/reports?status=${filter.value}`
                : "/admin/reports"
            }
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              status === filter.value
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {error && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          신고 목록을 불러오지 못했어요. admin.sql을 확인해주세요.
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-[920px] w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3">신고</th>
              <th className="px-4 py-3">신고자</th>
              <th className="px-4 py-3">대상</th>
              <th className="px-4 py-3">관련 자료</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const reportId = asString(report.report_id);
              const statusValue =
                typeof report.status === "string" &&
                report.status in REPORT_STATUS_LABELS
                  ? (report.status as ReportStatus)
                  : "pending";
              return (
                <tr
                  key={reportId}
                  className="border-t border-neutral-100"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {isReportReason(report.reason)
                        ? getReportReasonLabel(report.reason)
                        : "신고"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {reportId.slice(0, 8)} ·{" "}
                      {formatAdminDate(report.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {asString(report.reporter_nickname, "비공개 사용자")}
                  </td>
                  <td className="px-4 py-3">
                    {asString(report.reported_nickname, "비공개 사용자")}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {report.has_conversation === true ? "대화방 " : ""}
                    {report.has_message === true ? "메시지" : ""}
                    {report.has_conversation !== true &&
                    report.has_message !== true
                      ? "프로필 신고"
                      : ""}
                  </td>
                  <td className="px-4 py-3">
                    {REPORT_STATUS_LABELS[statusValue]}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/reports/${reportId}`}
                      className="font-semibold text-coral-600 hover:text-coral-700"
                    >
                      상세 보기
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
