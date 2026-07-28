import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import MobileNav from "@/components/mobile-nav";
import RequestsManager from "@/components/requests-manager";
import {
  getConversationRequestListItemFromRecord,
  type ConversationRequestListItem,
} from "@/lib/conversation-request";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
  }>;
}) {
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

  const query = await searchParams;
  const tabValue = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const initialTab = tabValue === "sent" ? "sent" : "received";
  const { data, error } = await supabase.rpc(
    "get_my_conversation_requests",
  );
  const items = Array.isArray(data)
    ? data
        .map(getConversationRequestListItemFromRecord)
        .filter(
          (
            item,
          ): item is ConversationRequestListItem => item !== null,
        )
    : [];

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-sm font-semibold text-coral-600">
          대화 연결
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          주고받은 인사를 확인해보세요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          받은 인사에 답하거나 내가 먼저 건넨 인사의 상태를 확인할 수 있어요.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          대화 요청을 불러오지 못했어요.
          conversation-requests.sql 실행 여부를 확인해주세요.
        </p>
      )}

      <RequestsManager
        initialItems={items}
        initialTab={initialTab}
      />
      <MobileNav current="home" />
    </AppShell>
  );
}
