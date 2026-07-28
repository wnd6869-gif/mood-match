import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import ConversationPreferencesForm from "@/components/conversation-preferences-form";
import {
  DEFAULT_PUBLIC_CHAT_PROFILE,
  getPublicChatProfileFromRecord,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { getSafeNextPath } from "@/lib/safe-navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConversationPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
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

  const [baseProfileResponse, settingsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(PUBLIC_CHAT_PROFILE_SELECT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const settings =
    getPublicChatProfileFromRecord(settingsResponse.data) ?? {
      id: user.id,
      ...DEFAULT_PUBLIC_CHAT_PROFILE,
    };
  const query = await searchParams;
  const requestedNext = Array.isArray(query.next)
    ? query.next[0]
    : query.next;
  const successPath = getSafeNextPath(requestedNext, "/home");

  return (
    <AppShell>
      <BackLink
        href="/profile/public"
        ariaLabel="공개 프로필 설정으로 돌아가기"
        label="공개 프로필"
      />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">
          대화 분위기 설정
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          어떤 대화를 원하나요?
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          지금 편하게 나누고 싶은 대화의 분위기와 방식을 알려주세요.
        </p>
      </header>

      {!baseProfileResponse.data ? (
        <section className="mt-7 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">
            기본 프로필이 먼저 필요해요
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            기본 프로필을 작성하면 대화 선호를 저장할 수 있어요.
          </p>
          <ActionLink
            href="/profile/setup"
            className="mt-5"
            ariaLabel="기본 프로필 작성 화면으로 이동하기"
          >
            기본 프로필 작성하기
          </ActionLink>
        </section>
      ) : (
        <ConversationPreferencesForm
          userId={user.id}
          initialPreferences={{
            conversation_goal: settings.conversation_goal,
            conversation_moods: settings.conversation_moods,
            conversation_topics: settings.conversation_topics,
            conversation_pace: settings.conversation_pace,
            preferred_group_size: settings.preferred_group_size,
            available_time_slots: settings.available_time_slots,
          }}
          initialLoadFailed={Boolean(settingsResponse.error)}
          successPath={successPath}
        />
      )}
    </AppShell>
  );
}
