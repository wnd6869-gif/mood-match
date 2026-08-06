import { notFound, redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import ConversationRequestButton from "@/components/conversation-request-button";
import PublicProfileVisual from "@/components/public-profile-visual";
import ProfileSafetyMenu from "@/components/safety-actions";
import {
  getDiscoverableProfileFromRecord,
} from "@/lib/conversation-request";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  CONVERSATION_PACE_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  findOptionLabel,
  GROUP_SIZE_OPTIONS,
  getPublicChatProfileFromRecord,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createOwnProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";
import { getDailyConversationCardFromRecord, getDailyConversationTopicLabel } from "@/lib/daily-conversation-card";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function TagList({ values }: { values: string[] }) {
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

export default async function DiscoverProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  if (!UUID_PATTERN.test(userId)) {
    notFound();
  }

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

  const [{ data, error }, ownProfileResponse] = await Promise.all([
    supabase.rpc("discover_available_chat_profiles", {
      p_target_user_id: userId,
      p_goal: null,
      p_mood: null,
      p_topic: null,
      p_one_to_one_only: false,
      p_time_slot: null,
    }),
    supabase
      .from("profiles")
      .select(PUBLIC_CHAT_PROFILE_SELECT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const profile = getDiscoverableProfileFromRecord(
    Array.isArray(data) ? data[0] : null,
  );

  if (!profile) {
    return (
      <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col">
        <BackLink
          href="/discover"
          ariaLabel="캐릭터 둘러보기 목록으로 돌아가기"
          label="둘러보기"
        />
        <div className="flex flex-1 flex-col justify-center py-10 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-neutral-100 text-2xl">
            ◌
          </span>
          <h1 className="mt-5 text-2xl font-bold text-neutral-900">
            현재 이 프로필을 볼 수 없어요
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            공개 상태가 아니거나 현재 서로 확인할 수 없는 프로필이에요.
          </p>
          {error && (
            <p className="mt-3 text-xs text-amber-700">
              direct-chat.sql 실행 여부를 확인해주세요.
            </p>
          )}
          <ActionLink
            href="/discover"
            className="mt-7"
            ariaLabel="캐릭터 둘러보기 목록으로 돌아가기"
          >
            목록으로 돌아가기
          </ActionLink>
        </div>
      </AppShell>
    );
  }

  const isOwnProfile = profile.userId === user.id;
  const ownProfile = getPublicChatProfileFromRecord(ownProfileResponse.data);
  const commonTopics = ownProfile
    ? profile.conversation_topics.filter((topic) =>
        ownProfile.conversation_topics.includes(topic),
      )
    : [];
  const sharedTimeSlots = ownProfile
    ? profile.available_time_slots.filter((slot) =>
        ownProfile.available_time_slots.includes(slot),
      )
    : [];
  const dailyCardResponse = !isOwnProfile
    ? await supabase.rpc("get_visible_daily_conversation_cards", {
        p_user_ids: [profile.userId],
      })
    : { data: [], error: null };
  const dailyCard = Array.isArray(dailyCardResponse.data)
    ? getDailyConversationCardFromRecord(dailyCardResponse.data[0])
    : null;
  const dailyTopic = dailyCard ? getDailyConversationTopicLabel(dailyCard) : null;
  // A public profile never exposes the real photo. The owner may still see
  // their own upload here; another member must enter a direct chat and obtain
  // mutual consent before the reveal gateway returns an image.
  const photoUrl = isOwnProfile
    ? await createOwnProfilePhotoSignedUrl(supabase, profile.userId)
    : null;
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

  return (
    <AppShell>
      <BackLink
        href="/discover"
        ariaLabel="캐릭터 둘러보기 목록으로 돌아가기"
        label="둘러보기"
      />

      <article className="mt-5 overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white shadow-sm">
        <PublicProfileVisual
          personaTitle={profile.personaTitle}
          animalTypes={profile.animalTypes}
          photoVisibility={profile.photo_visibility}
          photoUrl={photoUrl}
        />

        <div className="p-5">
          {!isOwnProfile && (
            <div className="-mt-1 mb-2 flex justify-end">
              <ProfileSafetyMenu
                targetUserId={profile.userId}
                targetNickname={profile.public_nickname}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {profile.public_nickname}
            </h1>
            {profile.ageDisplay && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
                {profile.ageDisplay}
              </span>
            )}
            {isOwnProfile && (
              <span className="rounded-full bg-coral-50 px-2.5 py-1 text-xs font-semibold text-coral-700">
                내 공개 프로필
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-coral-600">
            {profile.personaTitle}
          </p>
          <p className="mt-4 text-sm leading-6 text-neutral-600">
            {profile.personaDescription}
          </p>

          {profile.public_bio && (
            <p className="mt-4 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-6 text-coral-900">
              {profile.public_bio}
            </p>
          )}

          {dailyCard && (dailyCard.question || dailyTopic) && (
            <section className="mt-5 rounded-2xl border border-coral-100 bg-coral-50/70 px-4 py-4">
              <h2 className="text-sm font-bold text-coral-800">오늘 이 사람에게 물어보기</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-neutral-800">
                {dailyCard.question ?? dailyTopic}
              </p>
              {dailyCard.question && dailyTopic && (
                <p className="mt-1 text-xs text-neutral-500">오늘 꺼낼 소재 · {dailyTopic}</p>
              )}
            </section>
          )}

          <section className="mt-6 border-t border-neutral-100 pt-5">
            <h2 className="text-xs font-bold text-neutral-400">
              캐릭터 분위기
            </h2>
            <div className="mt-3">
              <TagList values={profile.moodKeywords} />
            </div>
          </section>

          <dl className="mt-6 space-y-5 border-t border-neutral-100 pt-5">
            <div>
              <dt className="text-xs font-bold text-neutral-400">
                지금 원하는 대화
              </dt>
              <dd className="mt-2 text-sm font-semibold text-neutral-800">
                {goalLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-neutral-400">
                원하는 대화 분위기
              </dt>
              <dd className="mt-2">
                <TagList values={moodLabels} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-neutral-400">
                관심 주제
              </dt>
              <dd className="mt-2">
                <TagList values={topicLabels} />
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-bold text-neutral-400">
                  대화 속도
                </dt>
                <dd className="mt-2 text-sm font-semibold leading-5 text-neutral-800">
                  {paceLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-neutral-400">
                  선호 대화 형태
                </dt>
                <dd className="mt-2 text-sm font-semibold leading-5 text-neutral-800">
                  {groupLabel}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs font-bold text-neutral-400">
                주로 접속하는 시간
              </dt>
              <dd className="mt-2">
                <TagList values={timeLabels} />
              </dd>
            </div>
          </dl>
        </div>
      </article>

      <div className="mt-6 space-y-3">
        {!isOwnProfile && (
          <ConversationRequestButton
            targetUserId={profile.userId}
            targetNickname={profile.public_nickname}
            preferredGroupSize={profile.preferred_group_size}
            requestStatus={profile.requestStatus}
            requestDirection={profile.requestDirection}
            todayQuestion={dailyCard?.question}
            todayTopic={dailyTopic}
            commonTopics={commonTopics}
            sharedTimeSlots={sharedTimeSlots}
            personaTitle={profile.personaTitle}
          />
        )}
        <ActionLink
          href="/discover"
          variant="secondary"
          ariaLabel="캐릭터 둘러보기 목록으로 돌아가기"
        >
          목록으로 돌아가기
        </ActionLink>
      </div>
    </AppShell>
  );
}
