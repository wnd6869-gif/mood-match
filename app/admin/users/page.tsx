import Link from "next/link";
import { UserModerationActions } from "@/components/admin-actions";
import {
  ADMIN_ROLE_LABELS,
  asNumber,
  asRecord,
  asRecords,
  asString,
  formatAdminDate,
  isAdminRole,
  isModerationStatus,
  MODERATION_STATUS_LABELS,
  MODERATION_STATUSES,
  requireAdmin,
} from "@/lib/admin";
import {
  getReportReasonLabel,
  isReportReason,
} from "@/lib/safety";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<
    Record<string, string | string[] | undefined>
  >;
}) {
  const { supabase, role, userId: currentUserId } =
    await requireAdmin();
  const query = await searchParams;
  const search = firstValue(query.search) ?? "";
  const status = firstValue(query.status) ?? "";
  const publicValue = firstValue(query.public) ?? "";
  const minReportsValue = firstValue(query.minReports) ?? "";
  const selectedUserId = firstValue(query.userId) ?? "";
  const publicFilter =
    publicValue === "true"
      ? true
      : publicValue === "false"
        ? false
        : null;
  const minReports = minReportsValue
    ? Math.max(0, Number(minReportsValue) || 0)
    : null;

  const [{ data, error }, detailResponse] = await Promise.all([
    supabase.rpc("admin_list_users", {
      search_query: search || null,
      status_filter: isModerationStatus(status) ? status : null,
      public_filter: publicFilter,
      min_reports: minReports,
    }),
    selectedUserId
      ? supabase.rpc("admin_get_user_detail", {
          target_user_id: selectedUserId,
        })
      : Promise.resolve({ data: null, error: null }),
  ]);
  const users = asRecords(data);
  const detail = asRecord(detailResponse.data);
  const detailUser = asRecord(detail.user);
  const detailCounts = asRecord(detail.counts);
  const detailStatus = isModerationStatus(
    detailUser.moderationStatus,
  )
    ? detailUser.moderationStatus
    : "active";
  const targetAdminRole = isAdminRole(detailUser.adminRole)
    ? detailUser.adminRole
    : null;

  return (
    <div>
      <header>
        <p className="text-sm font-semibold text-coral-600">계정 운영</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          사용자 관리
        </h2>
        <p className="mt-2 text-sm text-neutral-500">
          이메일은 마스킹되며 민감한 프로필 정보는 표시하지 않습니다.
        </p>
      </header>

      <form className="mt-6 grid gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input
          name="search"
          defaultValue={search}
          placeholder="ID, 닉네임, 이메일 검색"
          className="min-h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-coral-400 md:col-span-2"
        />
        <select
          name="status"
          defaultValue={status}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
        >
          <option value="">상태 전체</option>
          {MODERATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {MODERATION_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          name="public"
          defaultValue={publicValue}
          className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
        >
          <option value="">공개 여부 전체</option>
          <option value="true">공개</option>
          <option value="false">비공개</option>
        </select>
        <div className="flex gap-2">
          <input
            name="minReports"
            type="number"
            min={0}
            defaultValue={minReportsValue}
            placeholder="최소 신고"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 text-sm"
          />
          <button className="min-h-11 shrink-0 rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white">
            적용
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          사용자 목록을 불러오지 못했어요. admin.sql을 확인해주세요.
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3">사용자</th>
              <th className="px-4 py-3">가입일</th>
              <th className="px-4 py-3">공개</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">신고</th>
              <th className="px-4 py-3">최근 활동</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const userStatus = isModerationStatus(
                user.moderation_status,
              )
                ? user.moderation_status
                : "active";
              const userId = asString(user.user_id);
              return (
                <tr key={userId} className="border-t border-neutral-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold">
                      {asString(user.public_nickname, "닉네임 없음")}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      {asString(user.masked_email)} · {userId.slice(0, 8)}
                    </p>
                    {isAdminRole(user.admin_role) && (
                      <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700">
                        {ADMIN_ROLE_LABELS[user.admin_role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {formatAdminDate(user.joined_at, false)}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_public === true ? "공개" : "비공개"}
                  </td>
                  <td className="px-4 py-3">
                    {MODERATION_STATUS_LABELS[userStatus]}
                  </td>
                  <td className="px-4 py-3">
                    {asNumber(user.report_count)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {formatAdminDate(user.recent_activity_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users?userId=${encodeURIComponent(userId)}`}
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

      {selectedUserId && Object.keys(detailUser).length > 0 && (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400">
                사용자 상세 · {asString(detailUser.id).slice(0, 8)}
              </p>
              <h3 className="mt-1 text-2xl font-bold">
                {asString(detailUser.publicNickname, "공개 닉네임 없음")}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {asString(detailUser.email)}
              </p>
            </div>
            <Link
              href="/admin/users"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold"
            >
              상세 닫기
            </Link>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              <article className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h4 className="font-bold">프로필 요약</h4>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Detail label="페르소나" value={asString(detailUser.personaTitle, "없음")} />
                  <Detail label="공개 상태" value={detailUser.isPublic === true ? "공개" : "비공개"} />
                  <Detail label="성별" value={asString(detailUser.gender, "미입력")} />
                  <Detail label="선호 성별" value={asString(detailUser.preferredGender, "미입력")} />
                  <Detail label="가입일" value={formatAdminDate(detailUser.joinedAt)} />
                  <Detail label="마지막 로그인" value={formatAdminDate(detailUser.lastSignInAt)} />
                </dl>
              </article>
              <article className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h4 className="font-bold">활동 집계</h4>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <Count label="받은 신고" value={asNumber(detailCounts.reportsReceived)} />
                  <Count label="제출 신고" value={asNumber(detailCounts.reportsSubmitted)} />
                  <Count label="차단 관계" value={asNumber(detailCounts.blockRelations)} />
                  <Count label="참여 대화" value={asNumber(detailCounts.conversations)} />
                  <Count label="24시간 메시지" value={asNumber(detailCounts.messages24h)} />
                </div>
              </article>
              <ReportSummary
                title="신고받은 목록"
                reports={asRecords(detail.receivedReports)}
              />
              <ReportSummary
                title="신고한 목록"
                reports={asRecords(detail.submittedReports)}
              />
            </div>
            <UserModerationActions
              targetUserId={asString(detailUser.id)}
              currentStatus={detailStatus}
              isPublic={detailUser.isPublic === true}
              actorRole={role}
              targetAdminRole={targetAdminRole}
              isSelf={asString(detailUser.id) === currentUserId}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-neutral-400">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-700">{value}</dd>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-3 py-3">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function ReportSummary({
  title,
  reports,
}: {
  title: string;
  reports: Record<string, unknown>[];
}) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h4 className="font-bold">{title}</h4>
      <ul className="mt-3">
        {reports.length === 0 && (
          <li className="text-sm text-neutral-400">내역 없음</li>
        )}
        {reports.map((report) => (
          <li
            key={asString(report.id)}
            className="border-t border-neutral-100 py-3 text-sm first:border-0"
          >
            <span className="font-semibold">
              {isReportReason(report.reason)
                ? getReportReasonLabel(report.reason)
                : "신고"}
            </span>
            <span className="ml-2 text-neutral-400">
              {asString(report.status)} · {formatAdminDate(report.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
