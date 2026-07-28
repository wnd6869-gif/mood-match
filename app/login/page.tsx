"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton, ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import AuthField from "@/components/auth-field";
import BackLink from "@/components/back-link";
import { getKoreanAuthError } from "@/lib/supabase/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setErrorMessage("Supabase 환경변수 설정을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(getKoreanAuthError(error.message));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    router.replace("/mypage");
    router.refresh();
  }

  return (
    <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col sm:min-h-[calc(100dvh-4rem)]">
      <BackLink href="/" ariaLabel="랜딩 화면으로 돌아가기" />

      <div className="flex flex-1 flex-col justify-center py-8">
        <header>
          <p className="text-sm font-semibold text-coral-600">
            다시 만나서 반가워요
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
            로그인
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            가입한 이메일과 비밀번호를 입력해주세요.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
        >
          <AuthField
            id="login-email"
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            disabled={isSubmitting}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
          <AuthField
            id="login-password"
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 입력해주세요"
            value={password}
            disabled={isSubmitting}
            required
            onChange={(event) => setPassword(event.target.value)}
          />

          {errorMessage && (
            <p
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <ActionButton
            type="submit"
            disabled={isSubmitting}
            aria-label="입력한 이메일과 비밀번호로 로그인하기"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </ActionButton>
        </form>

        <div className="mt-4">
          <ActionLink
            href="/signup"
            variant="secondary"
            ariaLabel="새 이메일 계정 만들기"
          >
            처음이라면 회원가입
          </ActionLink>
        </div>
      </div>
    </AppShell>
  );
}
