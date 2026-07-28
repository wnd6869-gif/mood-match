import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import StoredImagePreview from "@/components/stored-image-preview";
import {
  getPersonaResultFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  CONVERSATION_PACE_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  DEFAULT_PUBLIC_CHAT_PROFILE,
  findOptionLabel,
  getAgeDisplay,
  getPublicChatProfileFromRecord,
  GROUP_SIZE_OPTIONS,
  hasCompleteConversationPreferences,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function TagList({
  values,
  emptyText,
}: {
  values: string[];
  emptyText: string;
}) {
  if (!values.length) {
    return <p className="text-sm text-neutral-400">{emptyText}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

export default async function PublicProfilePreviewPage() {
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

  const [profileResponse, personaResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select(`${PUBLIC_CHAT_PROFILE_SELECT_COLUMNS}, birth_date`)
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("personas")
      .select(PERSONA_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const profile =
    getPublicChatProfileFromRecord(profileResponse.data) ?? {
      id: user.id,
      ...DEFAULT_PUBLIC_CHAT_PROFILE,
    };
  const birthDate =
    profileResponse.data &&
    typeof profileResponse.data === "object" &&
    "birth_date" in profileResponse.data &&
    typeof profileResponse.data.birth_date === "string"
      ? profileResponse.data.birth_date
      : null;
  const persona = getPersonaResultFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const shouldLoadPhoto =
    profile.photo_visibility === "mutual" ||
    profile.photo_visibility === "public";
  const photoUrl = shouldLoadPhoto
    ? await createProfilePhotoSignedUrl(supabase, user.id)
    : null;
  const ageDisplay = getAgeDisplay(
    birthDate,
    profile.age_visibility,
  );
  const goalLabel = findOptionLabel(
    profile.conversation_goal,
    CONVERSATION_GOAL_OPTIONS,
  );
  const paceLabel = findOptionLabel(
    profile.conversation_pace,
    CONVERSATION_PACE_OPTIONS,
  );
  const groupLabel = findOptionLabel(
    profile.preferred_group_size,
    GROUP_SIZE_OPTIONS,
  );
  const moodLabels = profile.conversation_moods.map(
    (value) =>
      findOptionLabel(value, CONVERSATION_MOOD_OPTIONS) ?? value,
  );
  const topicLabels = profile.conversation_topics.map(
    (value) =>
      findOptionLabel(value, CONVERSATION_TOPIC_OPTIONS) ?? value,
  );
  const timeLabels = profile.available_time_slots.map(
    (value) =>
      findOptionLabel(value, AVAILABLE_TIME_OPTIONS) ?? value,
  );
  const hasCompletePreferences =
    hasCompleteConversationPreferences({
      conversation_goal: profile.conversation_goal,
      conversation_moods: profile.conversation_moods,
      conversation_topics: profile.conversation_topics,
      conversation_pace: profile.conversation_pace,
      preferred_group_size: profile.preferred_group_size,
      available_time_slots: profile.available_time_slots,
    });

  return (
    <AppShell>
      <BackLink
        href="/mypage"
        ariaLabel="마이페이지로 돌아가기"
        label="마이페이지"
      />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">
          공개 프로필 미리보기
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          다른 사람에게는 이렇게 보여요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          이메일과 생년월일 원본, 출생시간은 이 화면에 포함되지 않아요.
        </p>
      </header>

      {profileResponse.error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          공개 프로필 설정을 불러오지 못했어요.
          public-chat-profile.sql 실행 여부를 확인해주세요.
        </p>
      )}

      {!profile.is_public && (
        <p className="mt-6 rounded-2xl bg-neutral-100 px-4 py-3 text-sm leading-5 text-neutral-600">
          현재 공개 프로필이 비활성화되어 있어 다른 사용자에게는 노출되지
          않아요.
        </p>
      )}
      {profile.is_public && !hasCompletePreferences && (
        <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
          대화 분위기 설정을 완료하면 다른 사용자의 공개 목록에 노출돼요.
        </p>
      )}

      {!persona ? (
        <section className="mt-6 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900">
            먼저 AI 캐릭터를 만들어주세요
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            공개 프로필의 중심이 되는 AI 캐릭터 분석 결과가 필요해요.
          </p>
          <ActionLink
            href="/upload"
            className="mt-5"
            ariaLabel="사진을 업로드하고 AI 캐릭터 만들기"
          >
            AI 캐릭터 만들기
          </ActionLink>
        </section>
      ) : (
        <article className="mt-6 overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white shadow-sm">
          <div className="relative">
            {profile.photo_visibility === "persona_only" ? (
              <div
                role="img"
                aria-label={`${persona.personaTitle} AI 캐릭터 카드`}
                className="flex aspect-[4/3] flex-col items-center justify-center bg-gradient-to-br from-coral-50 via-white to-neutral-100 px-8 text-center"
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
                  ✦
                </span>
                <p className="mt-4 text-xs font-semibold tracking-wide text-coral-600">
                  AI PERSONA
                </p>
                <p className="mt-1 text-xl font-bold text-neutral-900">
                  {persona.personaTitle}
                </p>
              </div>
            ) : profile.photo_visibility === "mutual" ? (
              <div className="relative overflow-hidden">
                <StoredImagePreview
                  src={photoUrl}
                  alt="상호 동의 전 흐리게 표시된 프로필 사진"
                  className="rounded-none border-0 [&_img]:scale-110 [&_img]:blur-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/20 px-6 text-center">
                  <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-neutral-800 shadow-sm backdrop-blur">
                    서로 동의하면 실제 사진 공개
                  </span>
                </div>
              </div>
            ) : (
              <StoredImagePreview
                src={photoUrl}
                alt="공개 프로필 사진"
                className="rounded-none border-0"
              />
            )}
          </div>

          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                {profile.public_nickname ?? "공개 닉네임 미설정"}
              </h2>
              {ageDisplay && (
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
                  {ageDisplay}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-coral-600">
              {persona.personaTitle}
            </p>
            <p className="mt-4 text-sm leading-6 text-neutral-600">
              {persona.personaDescription}
            </p>
            {profile.public_bio && (
              <p className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-6 text-coral-900">
                {profile.public_bio}
              </p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-2">
              {persona.animalTypes.slice(0, 3).map((animal) => (
                <div
                  key={animal.name}
                  className="rounded-2xl bg-neutral-50 px-2 py-3 text-center"
                >
                  <p className="truncate text-xs font-semibold text-neutral-600">
                    {animal.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-neutral-900">
                    {animal.score}%
                  </p>
                </div>
              ))}
            </div>

            <section className="mt-6 border-t border-neutral-100 pt-5">
              <h3 className="text-xs font-bold text-neutral-400">
                캐릭터 분위기
              </h3>
              <div className="mt-3">
                <TagList
                  values={persona.moodKeywords}
                  emptyText="표시할 분위기가 없어요."
                />
              </div>
            </section>

            <dl className="mt-6 space-y-5 border-t border-neutral-100 pt-5">
              <div>
                <dt className="text-xs font-bold text-neutral-400">
                  지금 원하는 대화
                </dt>
                <dd className="mt-2 text-sm font-semibold text-neutral-800">
                  {goalLabel ?? "아직 선택하지 않았어요"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-neutral-400">
                  원하는 대화 분위기
                </dt>
                <dd className="mt-2">
                  <TagList
                    values={moodLabels}
                    emptyText="아직 선택하지 않았어요."
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-neutral-400">
                  관심 주제
                </dt>
                <dd className="mt-2">
                  <TagList
                    values={topicLabels}
                    emptyText="아직 선택하지 않았어요."
                  />
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-bold text-neutral-400">
                    대화 속도
                  </dt>
                  <dd className="mt-2 text-sm font-semibold leading-5 text-neutral-800">
                    {paceLabel ?? "미설정"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-neutral-400">
                    대화 형태
                  </dt>
                  <dd className="mt-2 text-sm font-semibold leading-5 text-neutral-800">
                    {groupLabel ?? "미설정"}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-bold text-neutral-400">
                  주로 접속하는 시간
                </dt>
                <dd className="mt-2">
                  <TagList
                    values={timeLabels}
                    emptyText="아직 선택하지 않았어요."
                  />
                </dd>
              </div>
            </dl>
          </div>
        </article>
      )}

      <div className="mt-6 space-y-3">
        <ActionLink
          href="/profile/public"
          ariaLabel="공개 캐릭터 프로필 수정하기"
        >
          공개 프로필 수정하기
        </ActionLink>
        <ActionLink
          href="/profile/conversation-preferences"
          variant="secondary"
          ariaLabel="대화 분위기 설정 수정하기"
        >
          대화 설정 수정하기
        </ActionLink>
      </div>
    </AppShell>
  );
}
