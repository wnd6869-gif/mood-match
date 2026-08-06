import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import PublicProfileForm from "@/components/public-profile-form";
import {
  getPersonaResultFromRecord,
  getCharacterCompositionFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import {
  DEFAULT_PUBLIC_CHAT_PROFILE,
  getPublicChatProfileFromRecord,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { getSafeNextPath } from "@/lib/safe-navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
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

  const [baseProfileResponse, settingsResponse, personaResponse] =
    await Promise.all([
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
      supabase
        .from("personas")
        .select(PERSONA_SELECT_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const persona = getPersonaResultFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const composition = getCharacterCompositionFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const initialSettings =
    getPublicChatProfileFromRecord(settingsResponse.data) ?? {
      id: user.id,
      ...DEFAULT_PUBLIC_CHAT_PROFILE,
    };
  const query = await searchParams;
  const requestedNext = Array.isArray(query.next)
    ? query.next[0]
    : query.next;
  const nextPath = getSafeNextPath(requestedNext, "/home");
  const conversationPreferencesPath =
    nextPath === "/home"
      ? "/profile/conversation-preferences"
      : `/profile/conversation-preferences?next=${encodeURIComponent(nextPath)}`;

  return (
    <AppShell>
      <BackLink
        href="/mypage"
        ariaLabel="마이페이지로 돌아가기"
        label="마이페이지"
      />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">
          공개 캐릭터 프로필
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          다른 사람에게 보일 나
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          기본 ID는 계정의 고정 이름이고, 공개 프로필은 그 ID와 함께 어떤
          정보를 다른 사용자에게 보여줄지 정하는 별도 설정이에요.
        </p>
        <div className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-xs leading-5 text-coral-800">
          공개 프로필을 켜거나 꺼도 기본 ID는 유지되며, 공개될 때는 기본
          ID와 동일한 이름이 표시돼요.
        </div>
      </header>

      {!baseProfileResponse.data ? (
        <section className="mt-7 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">
            기본 프로필이 먼저 필요해요
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            생년월일 등 기본 정보를 작성한 뒤 공개 범위를 설정할 수 있어요.
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
        <PublicProfileForm
          userId={user.id}
          initialSettings={initialSettings}
          persona={persona}
          composition={composition}
          initialLoadFailed={Boolean(settingsResponse.error)}
          successPath={conversationPreferencesPath}
        />
      )}
    </AppShell>
  );
}
