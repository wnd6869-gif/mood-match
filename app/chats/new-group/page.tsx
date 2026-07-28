import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import GroupChatCreateForm from "@/components/group-chat-create-form";
import {
  getGroupChatCandidateFromRecord,
  type GroupChatCandidate,
} from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewGroupChatPage() {
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

  const { data, error } = await supabase.rpc(
    "get_my_group_candidates",
  );
  const candidates = Array.isArray(data)
    ? data
        .map(getGroupChatCandidateFromRecord)
        .filter(
          (
            candidate,
          ): candidate is GroupChatCandidate => candidate !== null,
        )
    : [];

  return (
    <AppShell>
      <BackLink
        href="/chats"
        ariaLabel="채팅 목록으로 돌아가기"
      />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">
          소규모 단체방
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          함께 이야기할 방을 만들어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          연결된 사용자 중 소규모 단체 대화를 원하는 멤버를 초대할 수
          있어요.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          단체방 후보를 불러오지 못했어요. group-chat.sql 실행 여부를
          확인해주세요.
        </p>
      )}

      <GroupChatCreateForm candidates={candidates} />
    </AppShell>
  );
}
