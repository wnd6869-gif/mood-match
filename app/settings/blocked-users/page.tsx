import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import BlockedUsersList from "@/components/blocked-users-list";
import {
  getBlockedUserFromRecord,
  type BlockedUser,
} from "@/lib/safety";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BlockedUsersPage() {
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

  const { data, error } = await supabase.rpc("get_my_blocked_users");
  const users = Array.isArray(data)
    ? data
        .map(getBlockedUserFromRecord)
        .filter((item): item is BlockedUser => item !== null)
    : [];

  return (
    <AppShell>
      <BackLink href="/mypage" ariaLabel="마이페이지로 돌아가기" />
      <header className="mt-6">
        <p className="text-sm font-semibold text-coral-600">안전 설정</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          차단한 사용자 관리
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          차단 해제 후에도 이전 대화와 신고 기록은 그대로 유지돼요.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800"
        >
          차단 목록을 불러오지 못했어요. safety-moderation.sql 실행
          여부를 확인해주세요.
        </p>
      )}

      <BlockedUsersList initialUsers={users} />
    </AppShell>
  );
}
