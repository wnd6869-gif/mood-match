"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import { createClient } from "@/lib/supabase/client";
import { getKoreanAuthError } from "@/lib/supabase/auth-errors";

export default function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogout() {
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

    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      setErrorMessage(getKoreanAuthError(error.message));
      setIsSubmitting(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <ActionButton
        variant="secondary"
        disabled={isSubmitting}
        onClick={handleLogout}
        aria-label="현재 계정에서 로그아웃하기"
      >
        {isSubmitting ? "로그아웃 중..." : "로그아웃"}
      </ActionButton>
      {errorMessage && (
        <p
          role="alert"
          className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
        >
          {errorMessage}
        </p>
      )}
    </>
  );
}
