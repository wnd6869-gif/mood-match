import { redirect } from "next/navigation";
import { ActionLink } from "@/components/action";
import AppShell from "@/components/app-shell";
import LogoutButton from "@/components/logout-button";
import { getModerationStateFromRecord } from "@/lib/moderation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RestrictedPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase.rpc("get_my_moderation_status");
  const state = getModerationStateFromRecord(
    Array.isArray(data) ? data[0] : data,
  );

  if (state.status === "active" || state.status === "restricted") {
    redirect("/mypage");
  }

  const suspendedUntil = state.suspendedUntil
    ? new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(state.suspendedUntil))
    : null;

  return (
    <AppShell className="flex min-h-[calc(100dvh-3rem)] flex-col justify-center">
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-2xl">
          !
        </span>
        <p className="mt-5 text-sm font-semibold text-coral-600">
          이용 제한 안내
        </p>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">
          {state.status === "banned"
            ? "현재 서비스를 이용할 수 없어요"
            : "계정 이용이 일시 정지되었어요"}
        </h1>
        {suspendedUntil && (
          <p className="mt-3 text-sm font-semibold text-neutral-700">
            정지 종료 예정: {suspendedUntil}
          </p>
        )}
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {state.reason ??
            "서비스 운영 정책에 따라 계정 기능이 제한되었습니다."}
        </p>
        <div className="mt-6 space-y-3">
          <ActionLink
            href="/"
            variant="secondary"
            ariaLabel="서비스 메인 화면으로 이동"
          >
            메인 화면
          </ActionLink>
          <LogoutButton />
        </div>
      </section>
    </AppShell>
  );
}
