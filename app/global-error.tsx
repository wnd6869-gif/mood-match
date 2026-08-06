"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { boundary: "global-error" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 text-center">
          <div>
            <h1 className="text-2xl font-bold">잠시 문제가 발생했어요.</h1>
            <p className="mt-3 text-sm text-neutral-600">
              다시 시도해도 계속되면 잠시 후 다시 이용해주세요.
            </p>
            <button
              type="button"
              className="mt-6 rounded-xl bg-neutral-900 px-5 py-3 font-semibold text-white"
              onClick={() => window.location.reload()}
            >
              다시 시도하기
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
