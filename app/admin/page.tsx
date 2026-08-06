import Link from "next/link";
import {
  asNumber,
  asRecord,
  asRecords,
  asString,
  formatAdminDate,
  requireAdmin,
} from "@/lib/admin";
import {
  getReportReasonLabel,
  isReportReason,
} from "@/lib/safety";

const METRIC_LABELS = [
  ["totalUsers", "전체 사용자"],
  ["publicProfiles", "공개 프로필"],
  ["todayUsers", "오늘 가입"],
  ["pendingReports", "대기 중 신고"],
  ["reviewingReports", "검토 중 신고"],
  ["moderatedUsers", "제한·정지·차단"],
  ["directConversations", "1:1 대화방"],
  ["messages24h", "24시간 메시지"],
] as const;

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { data: analysisData, error: analysisError }] = await Promise.all([
    supabase.rpc("admin_dashboard"),
    supabase.rpc("admin_persona_analysis_metrics"),
  ]);
  const dashboard = asRecord(data);
  const analysisMetrics = asRecord(analysisData);
  const metrics = asRecord(dashboard.metrics);
  const recentReports = asRecords(dashboard.recentReports);
  const recentUsers = asRecords(dashboard.recentUsers);
  const recentActions = asRecords(dashboard.recentActions);

  return (
    <div>
      <header>
        <p className="text-sm font-semibold text-coral-600">운영 현황</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          관리자 대시보드
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          개인정보를 최소화한 서비스 운영 지표입니다.
        </p>
      </header>

      {error && (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          관리자 데이터를 불러오지 못했어요. admin.sql 실행 여부를
          확인해주세요.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRIC_LABELS.map(([key, label]) => (
          <article
            key={key}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold text-neutral-400">{label}</p>
            <p className="mt-2 text-3xl font-bold">
              {asNumber(metrics[key]).toLocaleString("ko-KR")}
            </p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="font-bold">AI 분석 상태 (최근 24시간)</h3>
            <p className="mt-1 text-xs text-neutral-500">
              OpenAI 토큰은 성공 저장된 분석 기준 집계입니다.
            </p>
          </div>
          {analysisError && (
            <p className="text-xs text-amber-700">분석 모니터링 migration 적용이 필요합니다.</p>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["요청", "requested"],
            ["실패", "failed"],
            ["실패율", "failureRate"],
            ["총 토큰", "totalTokens"],
          ].map(([label, key]) => (
            <div key={key} className="rounded-xl bg-neutral-50 p-4">
              <p className="text-xs font-semibold text-neutral-500">{label}</p>
              <p className="mt-1 text-2xl font-bold">
                {asNumber(analysisMetrics[key]).toLocaleString("ko-KR")}
                {key === "failureRate" ? "%" : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <AdminListCard title="최근 신고" href="/admin/reports">
          {recentReports.map((report) => {
            const reason = report.reason;
            return (
              <li key={asString(report.id)} className="border-t border-neutral-100 py-3 first:border-0">
                <p className="text-sm font-semibold">
                  {isReportReason(reason)
                    ? getReportReasonLabel(reason)
                    : "신고"}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  {asString(report.reporter_nickname, "비공개 사용자")} →{" "}
                  {asString(report.reported_nickname, "비공개 사용자")} ·{" "}
                  {formatAdminDate(report.created_at)}
                </p>
              </li>
            );
          })}
        </AdminListCard>

        <AdminListCard title="최근 가입" href="/admin/users">
          {recentUsers.map((user) => (
            <li key={asString(user.id)} className="border-t border-neutral-100 py-3 first:border-0">
              <p className="text-sm font-semibold">
                {asString(user.public_nickname, "공개 닉네임 없음")}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {asString(user.email, "이메일 없음")} ·{" "}
                {formatAdminDate(user.created_at)}
              </p>
            </li>
          ))}
        </AdminListCard>

        <AdminListCard title="최근 운영 조치" href="/admin/audit">
          {recentActions.map((action, index) => (
            <li key={`${asString(action.action)}-${index}`} className="border-t border-neutral-100 py-3 first:border-0">
              <p className="text-sm font-semibold">
                {asString(action.action) === "public_profile_disabled"
                  ? "공개 프로필 비활성화"
                  : "사용자 상태 변경"}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                대상 {asString(action.target_user_id).slice(0, 8)} ·{" "}
                {formatAdminDate(action.created_at)}
              </p>
            </li>
          ))}
        </AdminListCard>
      </div>
    </div>
  );
}

function AdminListCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold">{title}</h3>
        <Link
          href={href}
          className="text-xs font-semibold text-coral-600 hover:text-coral-700"
        >
          전체 보기
        </Link>
      </div>
      <ul className="mt-3">{children}</ul>
    </section>
  );
}
