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
  hasCompleteConversationProfile: boolean;
};

export default function PersonaResultView({
  userId,
  serverResult,
  personaIdentity,
  serverComposition,
  serverRecipe,
  hasCompleteConversationProfile,
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
            YOUR CHARACTER IS READY
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
            당신의 캐릭터가 완성됐어요
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/85">
            {result.personaTitle}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            @{personaIdentity ?? result.nicknameCandidates[0]}
          </p>
        </div>
      </section>

      <section className="mt-5 rounded-3xl bg-white px-5 py-5 shadow-sm">
        <p className="text-sm font-bold text-neutral-900">당신의 캐릭터가 완성됐어요</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          {result.personaDescription} 이 결과는 사진에서 읽은 분위기와 색감을 대화 캐릭터 스타일로 옮긴 참고 결과예요. 실제 성격이나 외모를 판단하지 않아요.
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-coral-100 bg-coral-50/60 px-5 py-4">
        <p className="text-sm font-bold text-neutral-900">사진은 기본적으로 비공개예요</p>
        <p className="mt-2 text-sm leading-6 text-neutral-600">업로드한 사진은 캐릭터 생성용이며 다른 사용자에게 자동 공개되지 않습니다. 사진은 대화가 시작된 뒤 서로 동의할 때만 해당 채팅방에서 공개됩니다.</p>
      </section>

      <div className="mt-4 space-y-4">
        <article className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-neutral-900">나의 대화 캐릭터 후보</h2>
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
                  aria-label={`${animal.name} 캐릭터 후보 비중`}
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
            사진에서 느껴지는 분위기와 대표 캐릭터를 조합해 자동으로 정했어요.
            다른 계정과 겹치지 않도록 확인하며, 공개 프로필에서도 같은
            ID를 사용해요.
          </p>
        </article>
      </div>

      <div className="mt-6 space-y-3">
        <ActionLink
          href={
            hasCompleteConversationProfile
              ? "/profile/preview"
              : "/profile/conversation-preferences?next=/profile/preview"
          }
          ariaLabel="대화 프로필 설정으로 이동하기"
        >
          {hasCompleteConversationProfile
            ? "내 공개 프로필 미리보기"
            : "대화 프로필 완성하기"}
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
