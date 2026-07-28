import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import {
  formatSafetyDate,
  getReportReasonLabel,
  getSubmittedReportFromRecord,
  REPORT_STATUS_LABELS,
  type SubmittedReport,
} from "@/lib/safety";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc("get_my_reports");
  const reports = Array.isArray(data)
    ? data
        .map(getSubmittedReportFromRecord)
        .filter((item): item is SubmittedReport => item !== null)
    : [];

  return (
    <AppShell>
      <BackLink href="/mypage" ariaLabel="마이페이지로 돌아가기" />
      <header className="mt-6">
        <p className="text-sm font-semibold text-coral-600">안전 설정</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          내가 제출한 신고
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          상대방 정보와 내부 검토 메모는 표시하지 않아요.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
        >
          신고 내역을 불러오지 못했어요. safety-moderation.sql 실행
          여부를 확인해주세요.
        </p>
      )}

      {reports.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-neutral-200/80 bg-white px-5 py-12 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
            ✓
          </span>
          <h2 className="mt-5 text-xl font-bold text-neutral-900">
            제출한 신고가 없어요
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            신고를 제출하면 처리 상태를 여기에서 확인할 수 있어요.
          </p>
        </section>
      ) : (
        <div className="mt-6 space-y-3">
          {reports.map((report) => (
            <article
              key={report.reportId}
              className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-400">
                    {formatSafetyDate(report.createdAt)}
                  </p>
                  <h2 className="mt-2 text-base font-bold text-neutral-900">
                    {getReportReasonLabel(report.reason)}
                  </h2>
                </div>
                <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600">
                  {REPORT_STATUS_LABELS[report.status]}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
