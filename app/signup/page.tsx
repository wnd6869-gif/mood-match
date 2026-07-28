"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton, ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import AuthField from "@/components/auth-field";
import BackLink from "@/components/back-link";
import { getKoreanAuthError } from "@/lib/supabase/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== passwordConfirmation) {
      setErrorMessage("비밀번호가 서로 일치하지 않아요.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("비밀번호는 6자 이상으로 입력해주세요.");
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setErrorMessage("Supabase 환경변수 설정을 확인해주세요.");
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setErrorMessage(getKoreanAuthError(error.message));
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      setIsSubmitting(false);
      router.replace("/mypage");
      router.refresh();
      return;
    }

    setSuccessMessage(
      "회원가입 확인 이메일을 보냈어요. 받은 편지함에서 인증을 완료해주세요.",
    );
    setIsSubmitting(false);
  }

  return (
    <AppShell>
      <BackLink href="/" ariaLabel="랜딩 화면으로 돌아가기" />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">Mood Match 시작하기</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          회원가입
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          이메일로 간단히 계정을 만들고 매칭 여정을 이어가세요.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5 rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-sm"
      >
        <AuthField
          id="signup-email"
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
          id="signup-password"
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          placeholder="6자 이상 입력해주세요"
          minLength={6}
          value={password}
          disabled={isSubmitting}
          required
          onChange={(event) => setPassword(event.target.value)}
        />
        <AuthField
          id="signup-password-confirmation"
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호를 한 번 더 입력해주세요"
          minLength={6}
          value={passwordConfirmation}
          disabled={isSubmitting}
          required
          onChange={(event) => setPasswordConfirmation(event.target.value)}
        />

        {errorMessage && (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p
            role="status"
            className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-700"
          >
            {successMessage}
          </p>
        )}

        <ActionButton
          type="submit"
          disabled={isSubmitting}
          aria-label="입력한 이메일과 비밀번호로 회원가입하기"
        >
          {isSubmitting ? "가입 중..." : "회원가입"}
        </ActionButton>
      </form>

      <div className="mt-4">
        <ActionLink
          href="/login"
          variant="secondary"
          ariaLabel="기존 계정으로 로그인하기"
        >
          이미 계정이 있어요
        </ActionLink>
      </div>
    </AppShell>
  );
}
