import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";

export default function Home() {
  return (
    <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col justify-center text-center sm:min-h-[calc(100dvh-4rem)]">
      <div
        className="relative mx-auto mb-8 h-36 w-full max-w-xs"
        aria-hidden="true"
      >
        <div className="absolute left-5 top-5 h-28 w-40 -rotate-6 rounded-3xl border border-neutral-200 bg-white shadow-sm" />
        <div className="absolute right-5 top-1 h-32 w-44 rotate-3 rounded-3xl border border-coral-100 bg-gradient-to-br from-white to-coral-50 shadow-md">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex -space-x-3">
              <span className="flex size-12 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-sm font-bold text-neutral-600">
                나
              </span>
              <span className="flex size-12 items-center justify-center rounded-full border-2 border-white bg-coral-100 text-sm font-bold text-coral-700">
                인연
              </span>
            </div>
            <span className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-coral-600 shadow-sm">
              mood match
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm font-semibold text-coral-600">AI 페르소나 매칭</p>
      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
          나를 닮은 캐릭터로
          <br />
          인연을 만나보세요
      </h1>

      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-neutral-600">
        사진 한 장으로 나만의 분위기 페르소나를 만들고, 잘 어울리는 인연을
        가볍게 만나보세요.
      </p>

      <ActionLink
        href="/upload"
        className="mt-8"
        ariaLabel="사진을 업로드하고 내 페르소나 만들기"
      >
        내 페르소나 만들기
      </ActionLink>
      <p className="mt-3 text-xs leading-5 text-neutral-400">
        사진 분석과 매칭 기능은 로그인 후 이용할 수 있어요.
      </p>

      <p className="mt-5 rounded-2xl bg-coral-50 px-4 py-3 text-xs leading-5 text-coral-800">
        현재 베타 서비스예요. 테스트 중 일부 데이터가 초기화되거나 기능이
        변경될 수 있어요.
      </p>

      <div className="mt-7 border-t border-neutral-200 pt-6">
        <p className="text-sm font-medium text-neutral-500">
          계정으로 이어서 이용하고 싶다면
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
