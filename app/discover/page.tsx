import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import MobileNav from "@/components/mobile-nav";
import PublicProfileVisual from "@/components/public-profile-visual";
import {
  getDiscoverableProfileFromRecord,
  type DiscoverableProfile,
} from "@/lib/conversation-request";
import {
  AVAILABLE_TIME_OPTIONS,
  CONVERSATION_GOAL_OPTIONS,
  CONVERSATION_MOOD_OPTIONS,
  CONVERSATION_TOPIC_OPTIONS,
  findOptionLabel,
  GROUP_SIZE_OPTIONS,
} from "@/lib/public-chat-profile";
import { createProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DiscoverSearchParams = {
  goal?: string | string[];
  mood?: string | string[];
  topic?: string | string[];
  time?: string | string[];
  oneToOne?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ActiveRequestBadge({
  profile,
}: {
  profile: DiscoverableProfile;
}) {
  if (profile.requestStatus === "accepted") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        대화 연결됨
      </span>
    );
  }

  if (profile.requestStatus === "pending") {
    return (
      <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
        {profile.requestDirection === "received"
          ? "상대가 신청했어요"
          : "신청 보냄"}
      </span>
    );
  }

  return null;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
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
  const goal = firstValue(query.goal) || null;
  const mood = firstValue(query.mood) || null;
  const topic = firstValue(query.topic) || null;
  const timeSlot = firstValue(query.time) || null;
  const oneToOneOnly = firstValue(query.oneToOne) === "true";
  const hasFilters = Boolean(
    goal || mood || topic || timeSlot || oneToOneOnly,
  );
  const { data, error } = await supabase.rpc(
    "discover_available_chat_profiles",
    {
      p_target_user_id: null,
      p_goal: goal,
      p_mood: mood,
      p_topic: topic,
      p_one_to_one_only: oneToOneOnly,
      p_time_slot: timeSlot,
    },
  );
  const profiles = Array.isArray(data)
    ? data
        .map(getDiscoverableProfileFromRecord)
        .filter(
          (profile): profile is DiscoverableProfile =>
            profile !== null,
        )
    : [];
  const photoEntries = await Promise.all(
    profiles.map(async (profile) => [
      profile.userId,
      profile.photo_visibility !== "persona_only"
        ? await createProfilePhotoSignedUrl(
            supabase,
            profile.userId,
          )
        : null,
    ] as const),
  );
  const photoUrls = new Map(photoEntries);

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-sm font-semibold text-coral-600">
          캐릭터 둘러보기
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          오늘은 누구와 이야기할까요?
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          이런 캐릭터는 어때요? 분위기와 대화 취향을 보고 편하게 인사를
          건네보세요.
        </p>
      </header>

      <form
        method="get"
        className="mt-6 rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="sr-only">대화 목표 필터</span>
            <select
              name="goal"
              defaultValue={goal ?? ""}
              className="min-h-12 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 outline-none focus:border-coral-400"
            >
              <option value="">대화 목표 전체</option>
              {CONVERSATION_GOAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">대화 분위기 필터</span>
            <select
              name="mood"
              defaultValue={mood ?? ""}
              className="min-h-12 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 outline-none focus:border-coral-400"
            >
              <option value="">분위기 전체</option>
              {CONVERSATION_MOOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">관심 주제 필터</span>
            <select
              name="topic"
              defaultValue={topic ?? ""}
              className="min-h-12 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 outline-none focus:border-coral-400"
            >
              <option value="">관심 주제 전체</option>
              {CONVERSATION_TOPIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">접속 시간 필터</span>
            <select
              name="time"
              defaultValue={timeSlot ?? ""}
              className="min-h-12 w-full cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 outline-none focus:border-coral-400"
            >
              <option value="">접속 시간 전체</option>
              {AVAILABLE_TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-neutral-50 px-3 text-sm font-semibold text-neutral-700">
          <input
            type="checkbox"
            name="oneToOne"
            value="true"
            defaultChecked={oneToOneOnly}
            className="size-5 cursor-pointer rounded border-neutral-300 accent-coral-500"
          />
          1:1 대화 가능한 사람만 보기
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {hasFilters ? (
            <Link
              href="/discover"
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              초기화
            </Link>
          ) : (
            <span className="flex min-h-12 items-center justify-center rounded-xl bg-neutral-50 text-xs text-neutral-400">
              필터를 골라보세요
            </span>
          )}
          <button
            type="submit"
            className="min-h-12 cursor-pointer rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
          >
            조건 적용
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800"
        >
          공개 프로필을 불러오지 못했어요.
          direct-chat.sql 실행 여부를 확인해주세요.
        </p>
      )}

      {profiles.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-neutral-200/80 bg-white px-5 py-12 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral-50 text-2xl">
            ◌
          </span>
          <h2 className="mt-5 text-xl font-bold text-neutral-900">
            {hasFilters
              ? "조건에 맞는 대화 상대가 없어요."
              : "아직 공개된 캐릭터가 없어요."}
          </h2>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {hasFilters
              ? "필터를 조금 넓혀서 다시 찾아보세요."
              : "새로운 캐릭터가 공개되면 이곳에서 만날 수 있어요."}
          </p>
        </section>
      ) : (
        <div className="mt-5 space-y-5">
          {profiles.map((profile) => {
            const goalLabel = findOptionLabel(
              profile.conversation_goal,
              CONVERSATION_GOAL_OPTIONS,
            );
            const groupLabel = findOptionLabel(
              profile.preferred_group_size,
              GROUP_SIZE_OPTIONS,
            );
            const moodLabels = profile.conversation_moods.map(
              (value) =>
                findOptionLabel(value, CONVERSATION_MOOD_OPTIONS) ??
                value,
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
            const timeLabels = profile.available_time_slots.map(
              (value) =>
                findOptionLabel(value, AVAILABLE_TIME_OPTIONS) ??
                value,
            );

            return (
              <article
                key={profile.userId}
                className="overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white shadow-sm"
              >
                <PublicProfileVisual
                  personaTitle={profile.personaTitle}
                  photoVisibility={profile.photo_visibility}
                  photoUrl={photoUrls.get(profile.userId) ?? null}
                  compact
                />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-bold text-neutral-900">
                          {profile.public_nickname}
                        </h2>
                        {profile.ageDisplay && (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
                            {profile.ageDisplay}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-coral-600">
                        {profile.personaTitle}
                      </p>
                    </div>
                    <ActiveRequestBadge profile={profile} />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">
                    {profile.personaDescription}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {profile.animalTypes.slice(0, 3).map((animal) => (
                      <div
                        key={animal.name}
                        className="rounded-xl bg-neutral-50 px-2 py-2.5 text-center"
                      >
                        <p className="truncate text-xs font-semibold text-neutral-600">
                          {animal.name}
                        </p>
                        <p className="mt-1 text-xs font-bold text-neutral-900">
                          {animal.score}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.moodKeywords.slice(0, 4).map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-coral-50 px-3 py-1.5 text-xs font-semibold text-coral-700"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>

                  <dl className="mt-4 space-y-2.5 rounded-2xl bg-neutral-50 px-4 py-3 text-xs">
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 font-semibold text-neutral-400">
                        대화 목표
                      </dt>
                      <dd className="font-semibold text-neutral-700">
                        {goalLabel}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 font-semibold text-neutral-400">
                        분위기
                      </dt>
                      <dd className="font-semibold text-neutral-700">
                        {moodLabels.join(" · ")}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 font-semibold text-neutral-400">
                        관심사
                      </dt>
                      <dd className="font-semibold text-neutral-700">
                        {topicLabels.join(" · ")}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 font-semibold text-neutral-400">
                        대화 형태
                      </dt>
                      <dd className="font-semibold text-neutral-700">
                        {groupLabel}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-16 shrink-0 font-semibold text-neutral-400">
                        접속 시간
                      </dt>
                      <dd className="font-semibold text-neutral-700">
                        {timeLabels.join(" · ")}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/discover/${profile.userId}`}
                    className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
                  >
                    프로필 자세히 보기
                  </Link>
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
