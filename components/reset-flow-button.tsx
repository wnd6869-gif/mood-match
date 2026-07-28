"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionButton } from "@/components/action";
import { clearPrototypeData } from "@/lib/prototype-storage";

type ResetFlowButtonProps = {
  className?: string;
};

export default function ResetFlowButton({
  className = "",
}: ResetFlowButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function handleReset() {
    const result = clearPrototypeData();

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace("/");
  }

  return (
    <>
      <ActionButton
        variant="secondary"
        onClick={handleReset}
        className={className}
        aria-label="저장된 테스트 데이터를 삭제하고 처음부터 다시 시작하기"
      >
        처음부터 다시
      </ActionButton>
      {error && (
        <p
          role="alert"
          className="mt-2 text-center text-xs leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </>
  );
}
