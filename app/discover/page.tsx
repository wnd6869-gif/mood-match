import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import DiscoverFilterSheet from "@/components/discover-filter-sheet";
import DiscoverSwipeDeck, {
  type DiscoverSwipeDeckItem,
} from "@/components/discover-swipe-deck";
import MobileNav from "@/components/mobile-nav";
import {
  getDiscoverableProfileFromRecord,
  type DiscoverableProfile,
} from "@/lib/conversation-request";
import { isCharacterRecipe } from "@/lib/persona-record";
import type { CharacterRecipe } from "@/lib/character-casting";
import {
  calculateRecommendationScore,
  getMatchPreferenceFromRecord,
} from "@/lib/match-preference";
import {
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
  { value: "available", label: "대화 선호 시간대" },
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
  // The RPC is added by avatar-recipes.sql. On projects that have not applied
  // it yet cards keep their existing composition fallback instead of failing.
  const recipeResponse = profiles.length > 0
    ? await supabase.rpc("get_visible_avatar_recipes", {
      p_user_ids: profiles.map((profile) => profile.userId),
    })
    : { data: [], error: null };
  const recipes = new Map(
    Array.isArray(recipeResponse.data)
      ? recipeResponse.data
          .filter((row): row is { user_id: string; character_recipe: unknown } => Boolean(row && typeof row === "object" && "user_id" in row && typeof row.user_id === "string"))
          .map((row) => [row.user_id, row.character_recipe])
      : [],
  );
  const profilesWithRecipes: Array<DiscoverableProfile & { characterRecipe: CharacterRecipe | null }> = profiles.map((profile) => {
    const candidateRecipe = recipes.get(profile.userId);
    return {
      ...profile,
      characterRecipe: isCharacterRecipe(candidateRecipe) ? candidateRecipe : null,
    };
  });
  const scoredProfiles = profilesWithRecipes.map((profile) => ({
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

  const swipeDeckItems: DiscoverSwipeDeckItem[] = scoredProfiles.map(
    ({ profile, score }) => ({
      userId: profile.userId,
      publicNickname: profile.public_nickname,
      personaTitle: profile.personaTitle,
      animalTypes: profile.animalTypes,
      characterRecipe: profile.characterRecipe,
      conversationGoal: profile.conversation_goal,
      conversationTopics: profile.conversation_topics,
      availableTimeSlots: profile.available_time_slots,
      preferredGroupSize: profile.preferred_group_size,
      requestStatus: profile.requestStatus,
      requestDirection: profile.requestDirection,
      score: score?.total ?? null,
    }),
  );

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
      {tab === "available" && (
        <p className="mt-3 text-xs leading-5 text-neutral-400">
          프로필에서 선택한 대화 선호 시간대가 지금과 맞는 캐릭터예요.
          실제 접속 상태를 뜻하지는 않아요.
        </p>
      )}
      {tab === "recommended" && (!matchPreference || !ownSettings) && (
        <section className="mt-5 rounded-[1.5rem] border border-coral-100 bg-coral-50/70 p-4">
          <p className="text-sm font-bold text-neutral-900">
            취향을 설정하면 더 잘 맞는 캐릭터를 추천해드려요.
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-600">
            관심 스타일과 대화 취향을 바탕으로 추천 점수를 계산해요.
          </p>
          <Link
            href="/ideal"
            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-neutral-900 px-3.5 text-xs font-bold text-white"
          >
            취향 설정하고 맞춤 추천 받기
          </Link>
        </section>
      )}
      <Link
        href="/chats/new-group"
        className="mt-5 flex items-center justify-between gap-4 rounded-[1.5rem] border border-[#dce8dd] bg-[#f3f8f3] p-4 transition-colors hover:bg-[#eaf4eb]"
      >
        <span>
          <span className="block text-sm font-bold text-neutral-900">
            혼자 시작하기 부담스럽다면, 소규모 단체방
          </span>
          <span className="mt-1 block text-xs leading-5 text-neutral-600">
            3~6명이 가볍게 인사하고 대화를 이어갈 수 있어요.
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold text-[#35705a]">
          단체방 만들기 →
        </span>
      </Link>

      {profilesResponse.error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          공개 캐릭터를 불러오지 못했어요. 추천 SQL 적용 상태를
          확인해주세요.
        </p>
      )}

      {swipeDeckItems.length === 0 ? (
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
        <DiscoverSwipeDeck
          items={swipeDeckItems}
          showRecommendationScore={tab === "recommended"}
          showSetupHint={
            tab === "recommended" && (!matchPreference || !ownSettings)
          }
        />
      )}

      <MobileNav current="discover" />
    </AppShell>
  );
}
