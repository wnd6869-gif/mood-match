"use client";

import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import CharacterAvatar from "@/components/character-avatar";
import AvatarRenderer from "@/components/avatar-renderer";
import ResetFlowButton from "@/components/reset-flow-button";
import ReanalyzeButton from "@/components/reanalyze-button";
import StepProgress from "@/components/step-progress";
import useOnboardingDraft from "@/hooks/use-onboarding-draft";
import type { PersonaAnalysisResult } from "@/lib/persona-analysis";
import { mapAnalysisToCharacter } from "@/lib/character/character-mapper";
import type { CharacterComposition } from "@/lib/character/character-types";
import type { CharacterRecipe } from "@/lib/character-casting";

type PersonaResultViewProps = {
  userId: string;
  serverResult: PersonaAnalysisResult | null;
  personaIdentity: string | null;
  serverComposition: CharacterComposition | null;
  serverRecipe: CharacterRecipe | null;
};

export default function PersonaResultView({
  userId,
  serverResult,
  personaIdentity,
  serverComposition,
  serverRecipe,
}: PersonaResultViewProps) {
  const { personaAnalysis } = useOnboardingDraft();
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

  const characterComposition = serverComposition ?? mapAnalysisToCharacter(result, userId);

  return (
    <AppShell>
      <BackLink
        href="/upload"
        ariaLabel="사진 선택 화면으로 돌아가기"
        label="사진 선택"
      />
      <StepProgress current={3} total={5} label="캐릭터 결과" />

      <section className="relative mt-7 overflow-hidden rounded-[2.25rem] bg-neutral-900 text-white shadow-[0_22px_55px_rgba(23,23,23,0.16)]">
        {serverRecipe ? (
          <AvatarRenderer recipe={serverRecipe} size={256} priority className="aspect-square w-full" alt={`${result.personaTitle} AI 동물 캐릭터`} />
        ) : (
          <CharacterAvatar animalTypes={result.animalTypes} personaTitle={result.personaTitle} priority composition={characterComposition} className="aspect-square w-full" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/45 to-transparent px-6 pb-6 pt-20">
          <p className="text-xs font-bold tracking-[0.15em] text-white/75">
            MY ANIMAL CHARACTER
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
            {result.personaTitle}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/80">
            @{personaIdentity ?? result.nicknameCandidates[0]}
          </p>
        </div>
      </section>

      <p className="mt-5 rounded-3xl bg-white px-5 py-4 text-sm leading-6 text-neutral-600 shadow-sm">
        {result.personaDescription}
      </p>

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

        <article className="rounded-3xl border border-coral-100 bg-coral-50 p-5 shadow-sm">
          <p className="text-xs font-bold text-coral-700">
            AI가 만든 내 기본 ID
          </p>
          <h2 className="mt-2 break-words text-2xl font-bold text-neutral-900">
            @{personaIdentity ?? result.nicknameCandidates[0]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            두 가지 분위기와 대표 동물상을 조합해 자동으로 정했어요.
            다른 계정과 겹치지 않도록 확인하며, 공개 프로필에서도 같은
            ID를 사용해요.
          </p>
        </article>
      </div>

      <div className="mt-6 space-y-3">
        <ActionLink
          href="/ideal"
          ariaLabel="관심 스타일과 대화 취향 설정으로 이동하기"
        >
          관심 스타일 설정하고 추천받기
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
        실제 얼굴 대신 이 동물 캐릭터가 프로필의 기본 이미지로 보여요.
      </p>
    </AppShell>
  );
}
