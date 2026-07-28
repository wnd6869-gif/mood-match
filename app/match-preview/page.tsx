import { ActionButton } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import ResetFlowButton from "@/components/reset-flow-button";
import StepProgress from "@/components/step-progress";
import StoredIdealSummary from "@/components/stored-ideal-summary";
import type { VisualTraits } from "@/lib/animal-archetypes";

const MATCH_POINTS = [
  "선호 visual archetype 우선 비교",
  "여섯 가지 visual traits 균형 반영",
  "동물상 취향은 보조 기준으로 반영",
] as const;

const MATCH_CANDIDATE: {
  visualTraits: VisualTraits;
  animalTypes: { name: string; score: number }[];
} = {
  visualTraits: {
    friendly: 86,
    cute: 72,
    calm: 78,
    playful: 52,
    stylish: 69,
    reliable: 81,
  },
  animalTypes: [
    { name: "고양이", score: 55 },
    { name: "수달", score: 25 },
    { name: "사슴", score: 20 },
  ],
};

export default function MatchPreviewPage() {
  return (
    <AppShell>
      <BackLink href="/ideal" ariaLabel="이상형 선택 화면으로 돌아가기" />
      <StepProgress current={5} total={5} label="매칭 미리보기" />

      <header className="mt-7">
        <p className="text-sm font-semibold text-coral-600">이상형 미리보기</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          잘 어울리는 인연을
          <br />
          찾았어요
        </h1>
      </header>

      <article className="mt-7 overflow-hidden rounded-[2rem] border border-neutral-200/80 bg-white shadow-[0_16px_50px_rgba(23,23,23,0.10)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-coral-100 via-white to-neutral-100 px-6 py-8 text-center">
          <span
            className="absolute -right-10 -top-12 size-32 rounded-full border border-white/70 bg-white/40"
            aria-hidden="true"
          />
          <span
            className="absolute -bottom-16 -left-8 size-36 rounded-full bg-coral-200/40"
            aria-hidden="true"
          />

          <span className="relative inline-flex rounded-full border border-white bg-white/80 px-3 py-1 text-[0.6875rem] font-bold tracking-[0.14em] text-coral-700 shadow-sm">
            BEST MATCH
          </span>
          <div
            role="img"
            aria-label="서윤의 프로필 이미지 자리"
            className="relative mx-auto mt-5 flex size-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-coral-200 to-neutral-200 text-2xl font-bold text-neutral-700 shadow-md"
          >
            서윤
          </div>
          <h2 className="relative mt-4 text-2xl font-bold text-neutral-900">
            서윤
          </h2>
          <span className="relative mt-2 inline-flex rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-coral-700 shadow-sm">
            다정한 고양이형
          </span>
        </div>

        <div className="p-5">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              두 사람이 잘 맞는 이유
            </h3>
            <StoredIdealSummary
              candidateTraits={MATCH_CANDIDATE.visualTraits}
              candidateAnimalTypes={MATCH_CANDIDATE.animalTypes}
            />
          </div>

          <div className="mt-6 border-t border-neutral-100 pt-5">
            <h3 className="text-base font-bold text-neutral-900">매칭 포인트</h3>
            <ul className="mt-4 space-y-3">
              {MATCH_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-3 text-sm font-medium text-neutral-700"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="size-3.5"
                    >
                      <path
                        d="m5 10 3 3 7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>

      <div className="mt-6 space-y-3">
        <ActionButton
          aria-label="서윤 매칭 결과에 마음에 들어요 표시하기"
          aria-describedby="prototype-note"
        >
          마음에 들어요
        </ActionButton>
        <ActionButton
          variant="secondary"
          aria-label="서윤 매칭 결과를 다음에 보기"
          aria-describedby="prototype-note"
        >
          다음에 볼게요
        </ActionButton>
        <ResetFlowButton />
      </div>

      <p
        id="prototype-note"
        className="mt-4 text-center text-xs leading-5 text-neutral-400"
      >
        현재 매칭 결과는 체험용 데이터이며 저장되지 않아요.
      </p>
    </AppShell>
  );
}
