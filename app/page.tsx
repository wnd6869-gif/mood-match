import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import CharacterChatHero from "@/components/character-chat-hero";

export default function Home() {
  return (
    <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col justify-center text-center sm:min-h-[calc(100dvh-4rem)]">
      <div className="mb-5 max-h-[220px] w-full">
        <CharacterChatHero />
      </div>

      <p className="text-sm font-semibold text-coral-600">AI 캐릭터 채팅</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
        내 분위기를 담은
        <br />
        캐릭터로 새로운 대화를
        <br />
        시작해보세요
      </h1>

      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-neutral-600">
        사진 한 장으로 내 분위기를 담은 캐릭터를 만들고, 다른 사람의
        캐릭터를 구경하며 편하게 대화를 시작해보세요.
      </p>

      <ActionLink
        href="/upload"
        className="mt-7"
        ariaLabel="사진을 업로드하고 내 AI 캐릭터 만들기"
      >
        내 캐릭터 만들기
      </ActionLink>
      <p className="mt-3 text-xs leading-5 text-neutral-400">
        캐릭터 생성과 대화 기능은 로그인 후 이용할 수 있어요.
      </p>

      <p className="mt-5 rounded-2xl bg-coral-50 px-4 py-3 text-xs leading-5 text-coral-800">
        현재 베타 서비스예요. 테스트 중 일부 데이터가 초기화되거나 기능이
        변경될 수 있어요.
      </p>

      <div className="mt-7 border-t border-neutral-200 pt-6">
        <p className="text-sm font-medium text-neutral-500">
          이미 계정이 있다면
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ActionLink
            href="/login"
            variant="secondary"
            ariaLabel="이메일 계정으로 로그인하기"
          >
            로그인
          </ActionLink>
          <ActionLink
            href="/signup"
            variant="secondary"
            ariaLabel="새 이메일 계정 만들기"
          >
            회원가입
          </ActionLink>
        </div>
      </div>
    </AppShell>
  );
}
