import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import CharacterAvatar from "@/components/character-avatar";
import ConversationRequestButton from "@/components/conversation-request-button";
import StepProgress from "@/components/step-progress";
import {
  getDiscoverableProfileFromRecord,
  type DiscoverableProfile,
} from "@/lib/conversation-request";
import {
  calculateRecommendationScore,
  getMatchPreferenceFromRecord,
  RECOMMENDATION_MIN_SCORE,
} from "@/lib/match-preference";
import {
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  findOptionLabel,
  getPublicChatProfileFromRecord,
  hasCompleteConversationPreferences,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatchPreviewPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?next=/match-preview");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/match-preview");
  }

  const [matchResponse, settingsResponse, profilesResponse] =
    await Promise.all([
      supabase
        .from("match_preferences")
        .select(
          "user_id, visual_archetype, preferred_animal, created_at, updated_at",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(PUBLIC_CHAT_PROFILE_SELECT_COLUMNS)
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("discover_available_chat_profiles", {
        p_target_user_id: null,
        p_goal: null,
        p_mood: null,
        p_topic: null,
        p_one_to_one_only: true,
        p_time_slot: null,
      }),
    ]);
  const matchPreference = getMatchPreferenceFromRecord(
    matchResponse.data,
  );
  const settings = getPublicChatProfileFromRecord(
    settingsResponse.data,
  );

  if (!matchPreference) {
    redirect("/ideal");
  }

  if (
    !settings ||
    !hasCompleteConversationPreferences({
      conversation_goal: settings.conversation_goal,
      conversation_moods: settings.conversation_moods,
      conversation_topics: settings.conversation_topics,
      conversation_pace: settings.conversation_pace,
      preferred_group_size: settings.preferred_group_size,
      available_time_slots: settings.available_time_slots,
    })
  ) {
    redirect(
      "/profile/conversation-preferences?next=/match-preview",
    );
  }

  const profiles = Array.isArray(profilesResponse.data)
    ? profilesResponse.data
        .map(getDiscoverableProfileFromRecord)
        .filter(
          (profile): profile is DiscoverableProfile =>
            profile !== null,
        )
    : [];
  const recommendations = profiles
    .map((profile) => ({
      profile,
      score: calculateRecommendationScore({
        candidate: profile,
        matchPreference,
        conversationPreferences: {
          conversation_goal: settings.conversation_goal,
          conversation_moods: settings.conversation_moods,
          conversation_topics: settings.conversation_topics,
          conversation_pace: settings.conversation_pace,
          preferred_group_size: settings.preferred_group_size,
          available_time_slots: settings.available_time_slots,
        },
      }),
    }))
    .filter(({ score }) => score.total >= RECOMMENDATION_MIN_SCORE)
    .sort((left, right) => right.score.total - left.score.total)
    .slice(0, 8);

  return (
    <AppShell>
      <BackLink
        href="/ideal"
        ariaLabel="관심 스타일 설정으로 돌아가기"
        label="관심 스타일"
      />
      <StepProgress current={5} total={5} label="실제 추천" />

      <header className="mt-7">
        <p className="text-sm font-semibold text-coral-600">
          실제 사용자 추천
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          지금 대화가 잘 맞을
          <br />
          캐릭터를 찾았어요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          대화 목적·관심사·접속 시간 60%, 캐릭터 분위기 40%를
          반영해 비교했어요.
        </p>
      </header>

      {profilesResponse.error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          실제 추천 사용자를 불러오지 못했어요. 추천 SQL 적용 상태를
          확인해주세요.
        </p>
      )}

      {recommendations.length === 0 ? (
        <section className="mt-7 rounded-[2rem] bg-[#f0f7f3] px-6 py-12 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
            ◌
          </span>
          <h2 className="mt-5 text-xl font-bold text-neutral-900">
            아직 잘 맞는 캐릭터가 없어요.
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            새로운 캐릭터가 들어오면 알려드릴게요.
          </p>
          <ActionLink
            href="/discover"
            variant="secondary"
            className="mt-6"
            ariaLabel="조건 없이 전체 캐릭터 둘러보기"
          >
            전체 캐릭터 둘러보기
          </ActionLink>
        </section>
      ) : (
        <div className="mt-7 space-y-5">
          {recommendations.map(({ profile, score }) => {
            const goalLabel = findOptionLabel(
              profile.conversation_goal,
              CONVERSATION_GOAL_OPTIONS,
            );
            const topicLabels = profile.conversation_topics
              .slice(0, 3)
              .map(
                (topic) =>
                  findOptionLabel(
                    topic,
                    CONVERSATION_TOPIC_OPTIONS,
                  ) ?? topic,
              );

            return (
              <article
                key={profile.userId}
                className="overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-[0_14px_35px_rgba(23,23,23,0.07)]"
              >
                <div className="grid grid-cols-[8rem_1fr]">
                  <CharacterAvatar
                    animalTypes={profile.animalTypes}
                    personaTitle={profile.personaTitle}
                    className="min-h-40"
                  />
                  <div className="min-w-0 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-coral-50 px-2.5 py-1 text-xs font-bold text-coral-700">
                        추천 {score.total}%
                      </span>
                      {profile.ageDisplay && (
                        <span className="text-xs font-semibold text-neutral-400">
                          {profile.ageDisplay}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 truncate text-lg font-bold text-neutral-900">
                      @{profile.public_nickname}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-coral-600">
                      {profile.personaTitle}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                      {goalLabel}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-neutral-50 px-3 py-3">
                      <p className="text-xs text-neutral-400">
                        캐릭터 분위기
                      </p>
                      <p className="mt-1 text-base font-bold text-neutral-900">
                        {score.character}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 px-3 py-3">
                      <p className="text-xs text-neutral-400">대화 취향</p>
                      <p className="mt-1 text-base font-bold text-neutral-900">
                        {score.conversation}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {score.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded-full bg-[#eef7f2] px-3 py-1.5 text-xs font-semibold text-[#35705a]"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                  {topicLabels.length > 0 && (
                    <p className="mt-4 text-xs leading-5 text-neutral-500">
                      관심사 · {topicLabels.join(" · ")}
                    </p>
                  )}

                  <div className="mt-5">
                    <ConversationRequestButton
                      targetUserId={profile.userId}
                      targetNickname={profile.public_nickname}
                      preferredGroupSize={profile.preferred_group_size}
                      requestStatus={profile.requestStatus}
                      requestDirection={profile.requestDirection}
                    />
                  </div>
                  <Link
                    href={`/discover/${profile.userId}`}
                    className="mt-3 flex min-h-11 items-center justify-center text-sm font-semibold text-neutral-500 underline decoration-neutral-300 underline-offset-4"
                  >
                    프로필 자세히 보기
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
