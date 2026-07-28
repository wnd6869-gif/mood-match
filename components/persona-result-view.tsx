"use client";

import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import ResetFlowButton from "@/components/reset-flow-button";
import ReanalyzeButton from "@/components/reanalyze-button";
import StepProgress from "@/components/step-progress";
import StoredImagePreview from "@/components/stored-image-preview";
import usePrototypeData from "@/hooks/use-prototype-data";
import type { PersonaAnalysisResult } from "@/lib/persona-analysis";

type PersonaResultViewProps = {
  photoUrl: string | null;
  userId: string;
  serverResult: PersonaAnalysisResult | null;
};

export default function PersonaResultView({
  photoUrl,
  userId,
  serverResult,
}: PersonaResultViewProps) {
  const { personaAnalysis } = usePrototypeData();
  const result =
    serverResult ??
    (personaAnalysis?.ownerId === userId
      ? personaAnalysis.result
      : null);

  if (!result) {
    return (
      <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
        <BackLink
          href="/upload"
          ariaLabel="사진 선택 화면으로 돌아가기"
          label="사진 선택"
        />
        <StepProgress current={3} total={5} label="캐릭터 결과" />

        <div className="flex flex-1 flex-col justify-center py-10 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-coral-50 text-coral-600">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-8"
            >
              <path
                d="M12 8v4m0 4h.01M4.9 19h14.2a2 2 0 0 0 1.73-3L13.73 3.7a2 2 0 0 0-3.46 0L3.17 16A2 2 0 0 0 4.9 19Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-neutral-900">
            분석 결과가 없어요
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            사진 분석을 먼저 완료하면 내 AI 캐릭터를 확인할 수 있어요.
          </p>
          <div className="mt-7 space-y-3">
            <ActionLink
              href="/analyzing"
              ariaLabel="업로드한 사진 다시 분석하기"
            >
              사진 분석하기
            </ActionLink>
            <ActionLink
              href="/upload"
              variant="secondary"
              ariaLabel="다른 사진 선택하기"
            >
              다른 사진 선택하기
            </ActionLink>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackLink
        href="/upload"
        ariaLabel="사진 선택 화면으로 돌아가기"
        label="사진 선택"
      />
      <StepProgress current={3} total={5} label="캐릭터 결과" />

      <header className="mt-7">
        <p className="text-sm font-semibold text-coral-600">
          사진에서 느껴진 나의 캐릭터
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          {result.personaTitle}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {result.personaDescription}
        </p>
      </header>

      <StoredImagePreview
        src={photoUrl}
        variant="card"
        className="mt-7 shadow-sm"
      />

      <div className="mt-4 space-y-4">
        <article className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-neutral-900">나의 동물상</h2>
            <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700">
              TOP 3
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {result.animalTypes.map((animal) => (
              <div key={animal.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">
                    {animal.name}
                  </span>
                  <span className="font-bold text-neutral-900">
                    {animal.score}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`${animal.name} 동물상 비율`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={animal.score}
                  className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-neutral-100"
                >
                  <div
                    className="h-full rounded-full bg-coral-400"
                    style={{ width: `${animal.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900">
            분위기 키워드
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.moodKeywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-coral-50 px-3.5 py-2 text-sm font-medium text-coral-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-neutral-900">추천 아이디</h2>
          <div className="mt-4 space-y-2.5">
            {result.nicknameCandidates.map((nickname) => (
              <div
                key={nickname}
                className="flex min-w-0 items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3"
              >
                <span className="shrink-0 text-sm text-coral-500">@</span>
                <span className="min-w-0 truncate text-sm font-semibold text-neutral-800">
                  {nickname}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="mt-6 space-y-3">
        <ActionLink
          href="/ideal"
          ariaLabel="관심 가는 캐릭터 분위기 선택 화면으로 이동하기"
        >
          관심 스타일 골라보기
        </ActionLink>
        <ReanalyzeButton />
        <ActionLink
          href="/upload"
          variant="secondary"
          ariaLabel="다른 사진을 선택해 분석하기"
        >
          다른 사진 선택하기
        </ActionLink>
        <ResetFlowButton />
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-neutral-400">
        사진에서 느껴지는 인상을 AI가 가볍게 표현한 결과예요.
      </p>
    </AppShell>
  );
}
