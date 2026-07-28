import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import ProfileForm from "@/components/profile-form";
import {
  PROFILE_SELECT_COLUMNS,
  type Profile,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfileSetupPage() {
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

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  const profile = error ? null : (data as Profile | null);

  return (
    <AppShell>
      <BackLink
        href="/mypage"
        ariaLabel="마이페이지로 돌아가기"
        label="마이페이지"
      />

      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">내 정보</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          프로필 {profile ? "수정" : "작성"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          캐릭터 프로필에 사용할 기본 정보를 입력해주세요. 언제든 다시
          수정할 수 있어요.
        </p>
      </header>

      <ProfileForm
        initialProfile={profile}
        initialLoadFailed={Boolean(error)}
      />
    </AppShell>
  );
}
