"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import { CHARACTER_REROLL_SESSION_KEY } from "@/lib/persona-analysis";
import { prepareForNewPersonaAnalysis } from "@/lib/onboarding-draft-storage";

export default function ReanalyzeButton() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  function handleReanalyze() {
    if (isNavigating) {
      return;
    }

    const confirmed = window.confirm(
      "AI 재분석에는 비용이 발생할 수 있어요. 현재 사진으로 다시 분석할까요?",
    );

    if (!confirmed) {
      return;
    }

    setIsNavigating(true);
    window.sessionStorage.setItem(
      CHARACTER_REROLL_SESSION_KEY,
      "true",
    );
    prepareForNewPersonaAnalysis();
    router.push("/analyzing");
  }

  return (
    <div>
      <ActionButton
        variant="secondary"
        disabled={isNavigating}
        onClick={handleReanalyze}
        aria-label="비용 안내를 확인하고 현재 사진 다시 분석하기"
      >
        {isNavigating ? "재분석 화면으로 이동 중..." : "현재 사진 재분석하기"}
      </ActionButton>
      <p className="mt-2 text-center text-xs leading-5 text-neutral-400">
        캐릭터 다시 만들기는 OpenAI 호출 비용이 발생할 수 있으며 하루 최대 2회 가능해요.
      </p>
    </div>
  );
}
