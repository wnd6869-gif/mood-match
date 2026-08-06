import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import CharacterAvatar from "@/components/character-avatar";
import LogoutButton from "@/components/logout-button";
import MobileNav from "@/components/mobile-nav";
import {
  getPersonaResultFromRecord,
  getCharacterCompositionFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import {
  getPublicChatProfileFromRecord,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PROFILE_MENU = [
  {
    href: "/profile/setup",
    label: "기본 정보",
    description: "닉네임과 기본 정보를 관리해요",
  },
  {
    href: "/profile/public",
    label: "공개 프로필",
    description: "다른 사용자에게 보일 내용을 정해요",
  },
  {
    href: "/profile/conversation-preferences",
    label: "대화 취향",
    description: "목적·분위기·관심 주제를 바꿔요",
  },
  {
    href: "/profile/public#photo-visibility",
    label: "사진 공개 범위",
    description: "실제 사진은 상호 동의 공개만 가능해요",
  },
] as const;

const SETTINGS_MENU = [
  {
    href: "/settings/blocked-users",
    label: "차단한 사용자",
    description: "차단 목록을 확인하고 해제해요",
  },
  {
    href: "/settings/reports",
    label: "신고 내역",
    description: "내가 접수한 신고 상태를 확인해요",
  },
  {
    href: "/privacy",
    label: "개인정보",
    description: "처리방침과 내 권리를 확인해요",
  },
] as const;

function MenuGroup({
  title,
  items,
}: {
  title: string;
  items: readonly {
    href: string;
    label: string;
    description: string;
  }[];
}) {
  return (
    <section className="mt-8">
      <h2 className="px-1 text-sm font-bold text-neutral-900">{title}</h2>
      <div className="mt-3 divide-y divide-neutral-100 overflow-hidden rounded-3xl bg-white px-5 shadow-sm ring-1 ring-neutral-200/70">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex min-h-20 items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="text-sm font-bold text-neutral-900">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {item.description}
              </p>
            </div>
            <span className="shrink-0 text-neutral-300">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function MyPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?next=/mypage");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/mypage");
  }

  const [personaResponse, profileResponse] = await Promise.all([
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
  ]);
  const persona = getPersonaResultFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const personaComposition = getCharacterCompositionFromRecord(
    personaResponse.data as PersonaRecord | null,
  );
  const publicProfile = getPublicChatProfileFromRecord(
    profileResponse.data,
  );

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-sm font-semibold text-coral-600">내 프로필</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
          마이
        </h1>
      </header>

      <section className="mt-6 flex items-center gap-4 rounded-[2rem] bg-neutral-900 p-4 text-white shadow-lg">
        {persona ? (
          <CharacterAvatar
            animalTypes={persona.animalTypes}
            personaTitle={persona.personaTitle}
            composition={personaComposition ?? undefined}
            className="size-24 shrink-0 rounded-[1.5rem]"
          />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-[1.5rem] bg-neutral-800 text-2xl">
            +
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-coral-300">
            기본 ID · 동물 캐릭터
          </p>
          <h2 className="mt-2 truncate text-xl font-bold">
            {publicProfile?.public_nickname
              ? `@${publicProfile.public_nickname}`
              : persona?.personaTitle ?? "캐릭터를 만들어주세요"}
          </h2>
          <p className="mt-2 text-xs leading-5 text-neutral-300">
            공개 프로필에서도 같은 ID와 동물 캐릭터를 사용해요.
          </p>
        </div>
      </section>

      {!persona && (
        <Link
          href="/upload"
          className="mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-coral-500 px-5 font-bold text-white"
        >
          내 동물 캐릭터 만들기
        </Link>
      )}

      {persona && !publicProfile?.is_public && (
        <section className="mt-4 rounded-[1.75rem] border border-coral-200 bg-coral-50 p-5 shadow-sm">
          <p className="text-sm font-bold text-coral-800">
            내 캐릭터를 공개하고 대화를 시작해보세요
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-700">
            공개하면 대화 제안과 둘러보기에서 캐릭터와 기본 ID가 보여요. 실제
            사진은 기본 비공개이고, 상호 동의했을 때만 공개돼요.
          </p>
          <Link
            href="/profile/public?next=/discover"
            className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-neutral-900 px-4 text-sm font-bold text-white"
          >
            공개 프로필 설정하기
          </Link>
        </section>
      )}

      <MenuGroup title="내 프로필" items={PROFILE_MENU} />
      <MenuGroup title="설정" items={SETTINGS_MENU} />

      <section className="mt-8">
        <h2 className="px-1 text-sm font-bold text-neutral-900">계정</h2>
        <div className="mt-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200/70">
          <p className="text-xs font-semibold text-neutral-400">
            로그인 이메일
          </p>
          <p className="mt-2 break-all text-sm font-bold text-neutral-800">
            {user.email ?? "이메일 정보 없음"}
          </p>
          <div className="mt-5">
            <LogoutButton />
          </div>
        </div>
      </section>

      <MobileNav current="mypage" />
    </AppShell>
  );
}
