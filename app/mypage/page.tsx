import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import LogoutButton from "@/components/logout-button";
import MobileNav from "@/components/mobile-nav";
import {
  getPersonaResultFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import {
  formatBirthDate,
  formatBirthTime,
  PROFILE_SELECT_COLUMNS,
  type Profile,
} from "@/lib/profile";
import {
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  findOptionLabel,
  getPublicChatProfileFromRecord,
  hasCompleteConversationPreferences,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyPage() {
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

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileError ? null : (data as Profile | null);
  const { data: personaData, error: personaError } = await supabase
    .from("personas")
    .select(PERSONA_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  const persona = personaError
    ? null
    : getPersonaResultFromRecord(
        personaData as PersonaRecord | null,
      );
  const {
    data: publicSettingsData,
    error: publicSettingsError,
  } = await supabase
    .from("profiles")
    .select(PUBLIC_CHAT_PROFILE_SELECT_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  const publicSettings = getPublicChatProfileFromRecord(
    publicSettingsData,
  );
  const { count: pendingReceivedCount } = await supabase
    .from("conversation_requests")
    .select("id", { count: "exact", head: true })
    .eq("receiver_id", user.id)
    .eq("status", "pending");
  const conversationGoalLabel = findOptionLabel(
    publicSettings?.conversation_goal ?? null,
    CONVERSATION_GOAL_OPTIONS,
  );
  const conversationMoodLabels =
    publicSettings?.conversation_moods.map(
      (value) =>
        findOptionLabel(value, CONVERSATION_MOOD_OPTIONS) ?? value,
    ) ?? [];
  const isPublicReady = Boolean(
    persona &&
      publicSettings?.is_public &&
      hasCompleteConversationPreferences({
        conversation_goal: publicSettings.conversation_goal,
        conversation_moods: publicSettings.conversation_moods,
        conversation_topics: publicSettings.conversation_topics,
        conversation_pace: publicSettings.conversation_pace,
        preferred_group_size: publicSettings.preferred_group_size,
        available_time_slots: publicSettings.available_time_slots,
      }),
  );

  return (
    <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
      <BackLink href="/" ariaLabel="랜딩 화면으로 돌아가기" label="홈" />

      <div className="flex flex-1 flex-col justify-center py-8">
        <header>
          <p className="text-sm font-semibold text-coral-600">내 계정</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
            마이페이지
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            현재 로그인한 계정과 프로필 정보를 확인할 수 있어요.
          </p>
        </header>

        <section className="mt-7 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400">로그인 이메일</p>
          <p className="mt-2 break-all text-base font-semibold text-neutral-900">
            {user.email ?? "이메일 정보 없음"}
          </p>
        </section>

        <section className="mt-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400">내 프로필</p>
              <h2 className="mt-2 text-lg font-bold text-neutral-900">
                {profile?.nickname ?? "아직 작성된 프로필이 없어요"}
              </h2>
            </div>
            {profile && (
              <span className="shrink-0 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-600">
                작성 완료
              </span>
            )}
          </div>

          {profile ? (
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-neutral-100 pt-5">
              <div>
                <dt className="text-xs font-medium text-neutral-400">생년월일</dt>
                <dd className="mt-1 text-sm font-semibold text-neutral-800">
                  {formatBirthDate(profile.birth_date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400">태어난 시간</dt>
                <dd className="mt-1 text-sm font-semibold text-neutral-800">
                  {formatBirthTime(
                    profile.birth_time,
                    profile.birth_time_unknown,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400">성별</dt>
                <dd className="mt-1 text-sm font-semibold text-neutral-800">
                  {profile.gender}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-400">
                  만나고 싶은 성별
                </dt>
                <dd className="mt-1 text-sm font-semibold text-neutral-800">
                  {profile.preferred_gender}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              기본 정보를 입력하면 마이페이지에서 한눈에 확인할 수 있어요.
            </p>
          )}

          {profileError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
            >
              프로필 정보를 불러오지 못했어요. profiles SQL 실행 여부를
              확인해주세요.
            </p>
          )}

          <div className="mt-5">
            <ActionLink
              href="/profile/setup"
              variant="secondary"
              ariaLabel={profile ? "내 프로필 수정하기" : "내 프로필 작성하기"}
            >
              {profile ? "프로필 수정하기" : "프로필 작성하기"}
            </ActionLink>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400">
                내 페르소나
              </p>
              <h2 className="mt-2 text-lg font-bold text-neutral-900">
                {persona?.personaTitle ?? "아직 분석된 페르소나가 없어요"}
              </h2>
            </div>
            {persona && (
              <span className="shrink-0 rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-600">
                분석 완료
              </span>
            )}
          </div>

          {persona ? (
            <>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {persona.personaDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {persona.moodKeywords.slice(0, 3).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              사진을 업로드하면 AI가 사진에서 느껴지는 분위기를 가볍게
              표현해드려요.
            </p>
          )}

          {personaError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
            >
              페르소나 정보를 불러오지 못했어요. personas SQL 실행 여부를
              확인해주세요.
            </p>
          )}

          <div className="mt-5">
            <ActionLink
              href={persona ? "/result" : "/upload"}
              variant="secondary"
              ariaLabel={
                persona
                  ? "내 페르소나 결과 상세보기"
                  : "사진을 업로드하고 페르소나 만들기"
              }
            >
              {persona ? "결과 상세보기" : "페르소나 만들기"}
            </ActionLink>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-400">
                공개 캐릭터 프로필
              </p>
              <h2 className="mt-2 text-lg font-bold text-neutral-900">
                {publicSettings?.public_nickname ??
                  "공개 프로필을 설정해보세요"}
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                publicSettings?.is_public
                  ? isPublicReady
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {isPublicReady
                ? "공개 중"
                : publicSettings?.is_public
                  ? "설정 필요"
                  : "비공개"}
            </span>
          </div>

          {!persona ? (
            <>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                먼저 AI 페르소나를 만들어주세요.
              </p>
              <ActionLink
                href="/upload"
                className="mt-5"
                ariaLabel="사진을 업로드하고 AI 페르소나 만들기"
              >
                AI 페르소나 만들기
              </ActionLink>
            </>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-neutral-50 px-4 py-3">
                <p className="text-xs font-semibold text-neutral-400">
                  지금 원하는 대화
                </p>
                <p className="mt-1.5 text-sm font-semibold text-neutral-800">
                  {conversationGoalLabel ?? "아직 선택하지 않았어요"}
                </p>
                {conversationMoodLabels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {conversationMoodLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {publicSettingsError && (
                <p
                  role="alert"
                  className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
                >
                  공개 설정을 불러오지 못했어요.
                  public-chat-profile.sql 실행 여부를 확인해주세요.
                </p>
              )}

              <div className="mt-5 space-y-3">
                <ActionLink
                  href="/profile/public"
                  ariaLabel="공개 캐릭터 프로필 설정하기"
                >
                  공개 캐릭터 프로필 설정
                </ActionLink>
                <ActionLink
                  href="/profile/conversation-preferences"
                  variant="secondary"
                  ariaLabel="대화 분위기 설정하기"
                >
                  대화 분위기 설정
                </ActionLink>
                <ActionLink
                  href="/profile/preview"
                  variant="secondary"
                  ariaLabel="공개 프로필 미리보기"
                >
                  공개 프로필 미리보기
                </ActionLink>
              </div>
            </>
          )}
        </section>

        <section className="mt-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400">
            대화 연결
          </p>
          <h2 className="mt-2 text-lg font-bold text-neutral-900">
            새로운 캐릭터와 이야기해보세요
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            공개 페르소나를 둘러보고 받은 신청과 보낸 신청을 관리할 수
            있어요.
          </p>
          <div className="mt-5 space-y-3">
            <ActionLink
              href="/discover"
              ariaLabel="공개 캐릭터 둘러보기"
            >
              캐릭터 둘러보기
            </ActionLink>
            <ActionLink
              href="/requests?tab=received"
              variant="secondary"
              ariaLabel={`받은 대화 신청 확인${
                pendingReceivedCount
                  ? `, 대기 중 ${pendingReceivedCount}개`
                  : ""
              }`}
            >
              <span className="flex items-center gap-2">
                받은 대화 신청
                {Boolean(pendingReceivedCount) && (
                  <span className="flex min-w-6 items-center justify-center rounded-full bg-coral-500 px-2 py-0.5 text-xs font-bold text-white">
                    {pendingReceivedCount}
                  </span>
                )}
              </span>
            </ActionLink>
            <ActionLink
              href="/requests?tab=sent"
              variant="secondary"
              ariaLabel="보낸 대화 신청 확인"
            >
              보낸 대화 신청
            </ActionLink>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-neutral-400">
            안전 및 운영
          </p>
          <h2 className="mt-2 text-lg font-bold text-neutral-900">
            신고와 차단 관리
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            차단한 사용자와 내가 제출한 신고 상태를 확인할 수 있어요.
          </p>
          <div className="mt-5 space-y-3">
            <ActionLink
              href="/settings/blocked-users"
              variant="secondary"
              ariaLabel="차단한 사용자 관리"
            >
              차단한 사용자 관리
            </ActionLink>
            <ActionLink
              href="/settings/reports"
              variant="secondary"
              ariaLabel="내가 제출한 신고 내역 확인"
            >
              신고 내역
            </ActionLink>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-coral-100 bg-coral-50/70 p-5">
          <p className="text-xs font-semibold text-coral-600">
            베타 서비스 안내
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            테스트 중 데이터가 초기화될 수 있어요. 계정과 테스트 데이터
            삭제가 필요하면 베타 운영자에게 요청해주세요. 공개 노출은 공개
            캐릭터 프로필 설정에서 언제든 비활성화할 수 있어요.
          </p>
        </section>

        <div className="mt-5">
          <LogoutButton />
        </div>
        <MobileNav current="mypage" />
      </div>
    </AppShell>
  );
}
