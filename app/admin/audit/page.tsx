import { notFound } from "next/navigation";
import {
  asRecord,
  asRecords,
  asString,
  formatAdminDate,
  requireAdmin,
} from "@/lib/admin";

const ACTION_LABELS: Record<string, string> = {
  user_status_changed: "사용자 상태 변경",
  report_status_changed: "신고 상태 변경",
  public_profile_disabled: "공개 프로필 비활성화",
  admin_note_changed: "관리자 메모 변경",
  persona_identity_cleared: "AI ID 삭제",
  persona_reanalysis_granted: "사진 재분석 기회 부여",
};

export default async function AdminAuditPage() {
  const { supabase, role } = await requireAdmin();

  if (role === "moderator") {
    notFound();
  }

  const { data, error } = await supabase.rpc(
    "admin_list_audit_logs",
  );
  const logs = asRecords(data);

  return (
    <div>
      <header>
        <p className="text-sm font-semibold text-coral-600">감사 기록</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          관리자 액션 로그
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          관리자와 최고 관리자만 조회할 수 있습니다.
        </p>
      </header>

      {error && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          감사 로그를 불러오지 못했어요.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {logs.map((log) => {
          const metadata = asRecord(log.metadata);
          return (
            <article
              key={asString(log.log_id)}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">
                    {ACTION_LABELS[asString(log.action)] ??
                      asString(log.action)}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400">
                    관리자 {asString(log.admin_user_id).slice(0, 8)}
                  </p>
                </div>
                <time className="text-xs text-neutral-400">
                  {formatAdminDate(log.created_at)}
                </time>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <Field
                  label="대상 사용자"
                  value={asString(log.target_user_id).slice(0, 8) || "-"}
                />
                <Field
                  label="대상 신고"
                  value={asString(log.target_report_id).slice(0, 8) || "-"}
                />
                <Field
                  label="변경"
                  value={[
                    asString(metadata.previousStatus),
                    asString(metadata.newStatus),
                  ]
                    .filter(Boolean)
                    .join(" → ") || "-"}
                />
              </dl>
            </article>
          );
        })}
        {logs.length === 0 && (
          <p className="rounded-2xl border border-neutral-200 bg-white px-5 py-12 text-center text-sm text-neutral-400">
            기록된 관리자 작업이 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-neutral-400">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-700">{value}</dd>
    </div>
  );
}
