import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import CharacterAvatar from "@/components/character-avatar";
import ConversationRequestButton from "@/components/conversation-request-button";
import DiscoverFilterSheet from "@/components/discover-filter-sheet";
import MobileNav from "@/components/mobile-nav";
import {
  getDiscoverableProfileFromRecord,
  type DiscoverableProfile,
} from "@/lib/conversation-request";
import {
  calculateRecommendationScore,
  getMatchPreferenceFromRecord,
} from "@/lib/match-preference";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  findOptionLabel,
  getPublicChatProfileFromRecord,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DiscoverTab = "recommended" | "new" | "available";

type DiscoverSearchParams = {
  tab?: string | string[];
  goal?: string | string[];
  mood?: string | string[];
  topic?: string | string[];
  time?: string | string[];
  oneToOne?: string | string[];
};

const TABS: { value: DiscoverTab; label: string }[] = [
  { value: "recommended", label: "추천" },
  { value: "new", label: "새로 가입" },
  { value: "available", label: "지금 대화 가능" },
];

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getCurrentTimeSlot() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );

  if (hour < 10) return "morning";
  if (hour < 17) return "daytime";
  if (hour < 22) return "evening";
  return "late_night";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?next=/discover");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/discover");
  }

  const query = await searchParams;
  const requestedTab = firstValue(query.tab);
  const tab: DiscoverTab = TABS.some(
    (item) => item.value === requestedTab,
  )
    ? (requestedTab as DiscoverTab)
    : "recommended";
  const goal = firstValue(query.goal) || null;
  const mood = firstValue(query.mood) || null;
  const topic = firstValue(query.topic) || null;
  const requestedTime = firstValue(query.time) || null;
  const timeSlot =
    requestedTime ?? (tab === "available" ? getCurrentTimeSlot() : null);
  const oneToOneOnly = firstValue(query.oneToOne) === "true";
  const hasFilters = Boolean(
    goal || mood || topic || requestedTime || oneToOneOnly,
  );
  const [profilesResponse, matchResponse, settingsResponse] =
    await Promise.all([
      supabase.rpc("discover_available_chat_profiles", {
        p_target_user_id: null,
        p_goal: goal,
        p_mood: mood,
        p_topic: topic,
        p_one_to_one_only: oneToOneOnly,
        p_time_slot: timeSlot,
      }),
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
    ]);
  const matchPreference = getMatchPreferenceFromRecord(
    matchResponse.data,
  );
  const ownSettings = getPublicChatProfileFromRecord(
    settingsResponse.data,
  );
  const profiles = Array.isArray(profilesResponse.data)
    ? profilesResponse.data
        .map(getDiscoverableProfileFromRecord)
        .filter(
          (profile): profile is DiscoverableProfile =>
            profile !== null,
        )
    : [];
  const scoredProfiles = profiles.map((profile) => ({
    profile,
    score:
      matchPreference && ownSettings
        ? calculateRecommendationScore({
            candidate: profile,
            matchPreference,
            conversationPreferences: {
              conversation_goal: ownSettings.conversation_goal,
              conversation_moods: ownSettings.conversation_moods,
              conversation_topics: ownSettings.conversation_topics,
              conversation_pace: ownSettings.conversation_pace,
              preferred_group_size: ownSettings.preferred_group_size,
              available_time_slots: ownSettings.available_time_slots,
            },
          })
        : null,
  }));

  if (tab === "recommended") {
    scoredProfiles.sort(
      (left, right) =>
        (right.score?.total ?? 0) - (left.score?.total ?? 0),
    );
  }

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-sm font-semibold text-coral-600">
          캐릭터 둘러보기
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          먼저 캐릭터부터
          <br />
          가볍게 만나보세요
        </h1>
      </header>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <Link
            key={item.value}
            href={`/discover?tab=${item.value}`}
            aria-current={tab === item.value ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === item.value
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-500"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <DiscoverFilterSheet
          tab={tab}
          initialValues={{
            goal,
            mood,
            topic,
            time: requestedTime,
            oneToOneOnly,
          }}
          hasFilters={hasFilters}
        />
      </div>
      {tab === "recommended" && matchPreference && ownSettings && (
        <p className="mt-3 text-xs leading-5 text-neutral-400">
          추천 점수는 대화 취향 60%와 캐릭터 분위기 40%를 기준으로
          계산해요.
        </p>
      )}

      {profilesResponse.error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          공개 캐릭터를 불러오지 못했어요. 추천 SQL 적용 상태를
          확인해주세요.
        </p>
      )}

      {scoredProfiles.length === 0 ? (
        <section className="mt-6 rounded-[2rem] bg-white px-5 py-12 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral-50 text-2xl">
            ◌
          </span>
          <h2 className="mt-5 text-xl font-bold text-neutral-900">
            지금 보여드릴 캐릭터가 없어요.
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            필터를 넓히거나 잠시 뒤 다시 둘러봐주세요.
          </p>
        </section>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {scoredProfiles.map(({ profile, score }) => {
            const goalLabel = findOptionLabel(
              profile.conversation_goal,
              CONVERSATION_GOAL_OPTIONS,
            );
            const topicLabels = profile.conversation_topics
              .slice(0, 3)
              .map(
                (value) =>
                  findOptionLabel(
                    value,
                    CONVERSATION_TOPIC_OPTIONS,
                  ) ?? value,
              );
            const timeLabels = profile.available_time_slots
              .slice(0, 2)
              .map(
                (value) =>
                  findOptionLabel(value, AVAILABLE_TIME_OPTIONS) ??
                  value,
              );

            return (
              <article
                key={profile.userId}
                className="min-w-0 overflow-hidden rounded-[1.6rem] bg-white shadow-[0_10px_28px_rgba(23,23,23,0.07)]"
              >
                <Link href={`/discover/${profile.userId}`}>
                  <CharacterAvatar
                    animalTypes={profile.animalTypes}
                    personaTitle={profile.personaTitle}
                    className="aspect-square"
                  />
                </Link>
                <div className="p-3.5">
                  {score && tab === "recommended" && (
                    <span className="inline-flex rounded-full bg-[#eef7f2] px-2.5 py-1 text-[0.65rem] font-bold text-[#35705a]">
                      추천 {score.total}%
                    </span>
                  )}
                  <Link href={`/discover/${profile.userId}`}>
                    <h2 className="mt-2 truncate text-sm font-bold text-neutral-900">
                      @{profile.public_nickname}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-coral-600">
                      {profile.personaTitle}
                    </p>
                  </Link>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-neutral-500">
                    {goalLabel}
                  </p>
                  <p className="mt-2 line-clamp-2 text-[0.68rem] leading-5 text-neutral-400">
                    {topicLabels.join(" · ")}
                  </p>
                  <p className="mt-1 truncate text-[0.68rem] text-neutral-400">
                    {timeLabels.length > 0
                      ? `${timeLabels.join(" · ")} 접속`
                      : "접속 시간 미설정"}
                  </p>
                  <div className="mt-3">
                    <ConversationRequestButton
                      targetUserId={profile.userId}
                      targetNickname={profile.public_nickname}
                      preferredGroupSize={profile.preferred_group_size}
                      requestStatus={profile.requestStatus}
                      requestDirection={profile.requestDirection}
                      compact
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <MobileNav current="discover" />
    </AppShell>
  );
}
