"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ActionButton, ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import AuthField from "@/components/auth-field";
import BackLink from "@/components/back-link";
import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal";
import { getKoreanAuthError } from "@/lib/supabase/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
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

    if (!termsAgreed || !privacyAgreed) {
      setErrorMessage("필수 약관에 모두 동의해주세요.");
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
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding/profile`,
        data: {
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          terms_agreed: true,
          privacy_agreed: true,
          marketing_agreed: marketingAgreed,
        },
      },
    });

    if (error) {
      setErrorMessage(getKoreanAuthError(error.message));
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      setIsSubmitting(false);
      router.replace("/onboarding/profile");
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
          이메일로 간단히 계정을 만들고 캐릭터와 대화를 이어가세요.
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

        <fieldset
          disabled={isSubmitting}
          className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
        >
          <legend className="px-1 text-sm font-bold text-neutral-900">
            약관 동의
          </legend>
          <div className="mt-2 space-y-3">
            <ConsentCheckbox
              id="terms-agreement"
              checked={termsAgreed}
              onChange={setTermsAgreed}
              required
              label="이용약관 동의"
              href="/terms"
            />
            <ConsentCheckbox
              id="privacy-agreement"
              checked={privacyAgreed}
              onChange={setPrivacyAgreed}
              required
              label="개인정보처리방침 확인 및 동의"
              href="/privacy"
            />
            <div className="border-t border-neutral-200 pt-3">
              <ConsentCheckbox
                id="marketing-agreement"
                checked={marketingAgreed}
                onChange={setMarketingAgreed}
                label="서비스 소식 및 이벤트 수신 동의"
              />
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500">
            선택 동의는 거부해도 가입할 수 있어요. 필수 약관에 동의하면 만
            14세 이상임을 확인하는 것으로 처리됩니다.
          </p>
        </fieldset>

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
          disabled={isSubmitting || !termsAgreed || !privacyAgreed}
          aria-label="입력한 이메일과 비밀번호로 회원가입하기"
        >
          {isSubmitting ? "가입 중..." : "회원가입"}
        </ActionButton>
      </form>

      <div className="mt-4">
        <ActionLink
          href="/login?next=/upload"
          variant="secondary"
          ariaLabel="기존 계정으로 로그인하기"
        >
          이미 계정이 있어요
        </ActionLink>
      </div>
    </AppShell>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  label,
  href,
  required = false,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  href?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-neutral-300 accent-coral-500 disabled:cursor-not-allowed"
      />
      <div className="min-w-0 flex-1 text-sm leading-5">
        <label htmlFor={id} className="cursor-pointer text-neutral-700">
          <span
            className={`mr-1 font-bold ${
              required ? "text-coral-700" : "text-neutral-500"
            }`}
          >
            [{required ? "필수" : "선택"}]
          </span>
          {label}
        </label>
        {href && (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-block font-semibold text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
            aria-label={`${label} 전문을 새 탭에서 확인`}
          >
            전문 보기
          </Link>
        )}
      </div>
    </div>
  );
}
