import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import CharacterAvatar from "@/components/character-avatar";
import ConversationRequestButton from "@/components/conversation-request-button";
import MobileNav from "@/components/mobile-nav";
import {
  getChatListItemFromRecord,
  type ChatListItem,
} from "@/lib/chat";
import {
  getDiscoverableProfileFromRecord,
  type DiscoverableProfile,
} from "@/lib/conversation-request";
import {
  getPersonaResultFromRecord,
  getCharacterCompositionFromRecord,
  getCharacterRecipeFromRecord,
  isCharacterRecipe,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import {
  getPublicChatProfileFromRecord,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?next=/home");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/home");
  }

  const [
    personaResponse,
    profileResponse,
    requestResponse,
    conversationsResponse,
    recommendationsResponse,
  ] = await Promise.all([
    supabase
      .from("personas")
      .select(PERSONA_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(PUBLIC_CHAT_PROFILE_SELECT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("conversation_requests")
      .select("id", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending"),
    supabase.rpc("get_my_conversations"),
    supabase.rpc("discover_available_chat_profiles", {
      p_target_user_id: null,
      p_goal: null,
      p_mood: null,
      p_topic: null,
      p_one_to_one_only: false,
      p_time_slot: null,
    }),
  ]);

  const persona = getPersonaResultFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const personaComposition = getCharacterCompositionFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const characterRecipe = getCharacterRecipeFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const publicProfile = getPublicChatProfileFromRecord(
    profileResponse.data,
  );
  const conversations = Array.isArray(conversationsResponse.data)
    ? conversationsResponse.data
        .map(getChatListItemFromRecord)
        .filter(
          (item): item is ChatListItem => item !== null,
        )
        .slice(0, 3)
    : [];
  const recommendation = Array.isArray(recommendationsResponse.data)
    ? recommendationsResponse.data
        .map(getDiscoverableProfileFromRecord)
        .find(
          (profile): profile is DiscoverableProfile =>
            profile !== null,
        ) ?? null
    : null;
  const recommendationRecipeResponse = recommendation
    ? await supabase.rpc("get_visible_avatar_recipes", {
        p_user_ids: [recommendation.userId],
      })
    : { data: [], error: null };
  const recommendationRecipe = Array.isArray(recommendationRecipeResponse.data)
    ? recommendationRecipeResponse.data
        .filter(
          (row): row is { user_id: string; character_recipe: unknown } =>
            Boolean(
              row &&
                typeof row === "object" &&
                "user_id" in row &&
                typeof row.user_id === "string",
            ),
        )
        .find((row) => row.user_id === recommendation?.userId)
        ?.character_recipe
    : null;

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-sm font-semibold text-coral-600">마이 홈</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          오늘은 누구와
          <br />
          이야기해볼까요?
        </h1>
      </header>

      <section className="mt-6 overflow-hidden rounded-[2rem] bg-neutral-900 text-white shadow-lg">
        {persona ? (
          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <CharacterAvatar
              animalTypes={persona.animalTypes}
              personaTitle={persona.personaTitle}
              composition={personaComposition ?? undefined}
              recipe={characterRecipe ?? undefined}
              variant="card"
              className="min-h-44"
            />
            <div className="min-w-0 flex flex-col justify-center p-4 sm:p-5">
              <p className="text-xs font-bold text-coral-300">
                내 동물 캐릭터
              </p>
              <h2 className="mt-2 text-xl font-bold leading-snug">
                {publicProfile?.public_nickname
                  ? `@${publicProfile.public_nickname}`
                  : persona.personaTitle}
              </h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-300">
                {persona.personaDescription}
              </p>
              <Link
                href="/result"
                className="mt-4 text-sm font-bold text-white underline decoration-coral-400 underline-offset-4"
              >
                캐릭터 자세히 보기
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-sm font-bold text-coral-300">
              아직 내 캐릭터가 없어요
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              사진 한 장으로 시작해보세요
            </h2>
            <Link
              href="/upload"
              className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-white px-5 text-sm font-bold text-neutral-900"
            >
              내 캐릭터 만들기
            </Link>
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          href="/requests?tab=received"
          className="rounded-3xl bg-[#eee7ff] p-5 text-[#594482]"
        >
          <p className="text-xs font-bold">받은 대화 요청</p>
          <p className="mt-2 text-3xl font-black">
            {requestResponse.count ?? 0}
          </p>
          <p className="mt-2 text-xs font-semibold">확인하러 가기 →</p>
        </Link>
        <Link
          href="/profile/conversation-preferences"
          className="rounded-3xl bg-[#e9eddf] p-5 text-[#56603f]"
        >
          <p className="text-xs font-bold">대화 취향</p>
          <p className="mt-2 text-lg font-black leading-snug">
            나와 맞는
            <br />
            대화 찾기
          </p>
          <p className="mt-2 text-xs font-semibold">설정하기 →</p>
        </Link>
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-400">
              오늘의 추천
            </p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">
              먼저 캐릭터로 만나보세요
            </h2>
          </div>
          <Link
            href="/discover"
            className="text-sm font-bold text-coral-600"
          >
            더 보기
          </Link>
        </div>

        {recommendation ? (
          <article className="mt-4 overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-neutral-200/70">
            <Link
              href={`/discover/${recommendation.userId}`}
              className="grid grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)]"
            >
              <CharacterAvatar
                animalTypes={recommendation.animalTypes}
                personaTitle={recommendation.personaTitle}
                recipe={
                  isCharacterRecipe(recommendationRecipe)
                    ? recommendationRecipe
                    : undefined
                }
                variant="card"
                className="min-h-40"
              />
              <div className="min-w-0 p-4 sm:p-5">
                <p className="text-xs font-bold text-coral-600">
                  @{recommendation.public_nickname}
                </p>
                <h3 className="mt-2 text-lg font-bold text-neutral-900">
                  {recommendation.personaTitle}
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {recommendation.conversation_topics
                    .slice(0, 3)
                    .map((topic) => (
                      <span
                        key={topic}
                        className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500"
                      >
                        {topic}
                      </span>
                    ))}
                </div>
              </div>
            </Link>
            <div className="px-4 pb-4">
              <ConversationRequestButton
                targetUserId={recommendation.userId}
                targetNickname={recommendation.public_nickname}
                preferredGroupSize={recommendation.preferred_group_size}
                requestStatus={recommendation.requestStatus}
                requestDirection={recommendation.requestDirection}
                compact
              />
            </div>
          </article>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed border-neutral-300 bg-white p-6 text-center">
            <p className="text-sm font-bold text-neutral-700">
              아직 추천할 공개 캐릭터가 없어요
            </p>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              새로운 캐릭터가 들어오면 이곳에서 바로 만날 수 있어요.
            </p>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-400">최근 채팅</p>
            <h2 className="mt-1 text-xl font-bold text-neutral-900">
              이어서 이야기하기
            </h2>
          </div>
          <Link href="/chats" className="text-sm font-bold text-coral-600">
            전체 보기
          </Link>
        </div>
        {conversations.length > 0 ? (
          <div className="mt-4 divide-y divide-neutral-100 rounded-3xl bg-white px-4 shadow-sm ring-1 ring-neutral-200/70">
            {conversations.map((conversation) => (
              <Link
                key={conversation.conversationId}
                href={`/chats/${conversation.conversationId}`}
                className="flex items-center gap-3 py-4"
              >
                {conversation.conversationType === "direct" ? (
                  <CharacterAvatar
                    personaTitle={conversation.otherPersonaTitle}
                    className="size-12 shrink-0 rounded-2xl"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-mint-100 text-lg">
                    ◉
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-900">
                    {conversation.conversationType === "group"
                      ? conversation.conversationTitle ?? "단체방"
                      : `@${conversation.otherPublicNickname}`}
                  </p>
                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {conversation.lastMessagePreview ??
                      "먼저 인사를 건네보세요."}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="rounded-full bg-coral-500 px-2 py-1 text-xs font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <Link
            href="/discover"
            className="mt-4 block rounded-3xl bg-[#fff0d9] p-6 text-[#7a491a]"
          >
            <p className="font-bold">아직 이어지는 대화가 없어요</p>
            <p className="mt-2 text-sm">마음에 드는 캐릭터를 만나보세요 →</p>
          </Link>
        )}
      </section>

      <MobileNav current="home" />
    </AppShell>
  );
}
