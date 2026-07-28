"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton, ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import StepProgress from "@/components/step-progress";
import StoredImagePreview from "@/components/stored-image-preview";
import {
  FORCE_REANALYSIS_SESSION_KEY,
  parsePersonaAnalysisResult,
} from "@/lib/persona-analysis";
import {
  getPrototypeStorageSnapshot,
  parsePrototypeStorage,
  prepareForNewPersonaAnalysis,
  savePersonaAnalysis,
} from "@/lib/prototype-storage";

const ANALYSIS_STEPS = [
  "사진의 인상과 분위기를 살펴보는 중",
  "어울리는 동물상을 찾는 중",
  "나만의 페르소나를 만드는 중",
] as const;

type AnalyzingViewProps = {
  photoUrl: string | null;
  userId: string;
};

type AnalysisStatus = "loading" | "error";

export default function AnalyzingView({
  photoUrl,
  userId,
}: AnalyzingViewProps) {
  const router = useRouter();
  const isRequestingRef = useRef(false);
  const hasStartedRef = useRef(false);
  const forceRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<AnalysisStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runAnalysis = useCallback(async (force = false) => {
    if (isRequestingRef.current) {
      return;
    }

    isRequestingRef.current = true;
    setStatus("loading");
    setCurrentStep(0);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze-persona", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force }),
      });
      const payload = (await response.json().catch(() => null)) as {
        result?: unknown;
        error?: string;
      } | null;

      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "사진을 분석하지 못했어요. 잠시 후 다시 시도해주세요.",
        );
      }

      const result = parsePersonaAnalysisResult(payload?.result);

      if (!result) {
        throw new Error(
          "분석 결과 형식이 올바르지 않아요. 다시 시도해주세요.",
        );
      }

      const saveResult = savePersonaAnalysis(userId, result);

      if (!saveResult.ok) {
        throw new Error(saveResult.error);
      }

      router.replace("/result");
      router.refresh();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "사진을 분석하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      isRequestingRef.current = false;
    }
  }, [router, userId]);

  useEffect(() => {
    router.prefetch("/result");

    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const storedData = parsePrototypeStorage(
      getPrototypeStorageSnapshot(),
    );
    const force =
      window.sessionStorage.getItem(FORCE_REANALYSIS_SESSION_KEY) ===
      "true";
    window.sessionStorage.removeItem(FORCE_REANALYSIS_SESSION_KEY);
    forceRef.current = force;

    if (!force && storedData.personaAnalysis?.ownerId === userId) {
      router.replace("/result");
      return;
    }

    prepareForNewPersonaAnalysis();
    window.setTimeout(() => {
      void runAnalysis(force);
    }, 0);
  }, [router, runAnalysis, userId]);

  useEffect(() => {
    if (status !== "loading") {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentStep((step) =>
        Math.min(step + 1, ANALYSIS_STEPS.length - 1),
      );
    }, 1_600);

    return () => window.clearInterval(timer);
  }, [status]);

  return (
    <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
      <StepProgress current={2} total={5} label="분위기 분석" />

      <div
        className="flex flex-1 flex-col items-center justify-center pb-10 text-center"
        aria-busy={status === "loading"}
      >
        <p className="text-sm font-semibold text-coral-600">
          AI 페르소나 만들기
        </p>

        <div className="relative mt-10 flex size-28 items-center justify-center">
          {status === "loading" && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-coral-100 opacity-55 motion-reduce:animate-none" />
              <span className="absolute inset-3 animate-pulse rounded-full bg-coral-200 motion-reduce:animate-none" />
            </>
          )}
          <StoredImagePreview
            src={photoUrl}
            variant="avatar"
            className="relative ring-4 ring-white shadow-sm"
          />
        </div>

        <h1 className="mt-10 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          {status === "loading" ? (
            <>
              AI가 당신의 분위기를
              <br />
              분석하고 있어요
            </>
          ) : (
            <>
              분석을 완료하지
              <br />
              못했어요
            </>
          )}
        </h1>

        {status === "loading" ? (
          <>
            <div
              role="status"
              aria-live="polite"
              className="mt-6 flex min-h-7 items-center justify-center gap-2 text-sm font-medium text-neutral-600"
            >
              <span>{ANALYSIS_STEPS[currentStep]}</span>
              <span className="flex gap-1" aria-hidden="true">
                <span className="size-1 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s] motion-reduce:animate-none" />
                <span className="size-1 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s] motion-reduce:animate-none" />
                <span className="size-1 animate-bounce rounded-full bg-neutral-400 motion-reduce:animate-none" />
              </span>
            </div>

            <div className="mx-auto mt-8 flex w-fit gap-2" aria-hidden="true">
              {ANALYSIS_STEPS.map((step, index) => (
                <span
                  key={step}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index <= currentStep
                      ? "w-7 bg-coral-500"
                      : "w-1.5 bg-neutral-200"
                  }`}
                />
              ))}
            </div>

            <p className="mt-8 max-w-xs text-xs leading-5 text-neutral-400">
              실제 분석은 사진에 따라 잠시 시간이 걸릴 수 있어요.
            </p>
          </>
        ) : (
          <div className="mt-6 w-full">
            <p
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {errorMessage}
            </p>
            <div className="mt-5 space-y-3">
              <ActionButton
                onClick={() => {
                  prepareForNewPersonaAnalysis();
                  void runAnalysis(forceRef.current);
                }}
                aria-label="사진 분석 다시 시도하기"
              >
                다시 시도하기
              </ActionButton>
              <ActionLink
                href="/upload"
                variant="secondary"
                ariaLabel="사진 선택 화면으로 돌아가기"
              >
                다른 사진 선택하기
              </ActionLink>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
