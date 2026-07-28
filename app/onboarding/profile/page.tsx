import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import ProfileForm from "@/components/profile-form";
import StepProgress from "@/components/step-progress";
import {
  PROFILE_SELECT_COLUMNS,
  type Profile,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?next=/onboarding/profile");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding/profile");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  const profile = error ? null : (data as Profile | null);

  return (
    <AppShell>
      <StepProgress current={1} total={5} label="기본 프로필" />
      <header className="mt-8">
        <p className="text-sm font-semibold text-coral-600">
          캐릭터 만들기 준비
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          먼저 기본 정보를
          <br />
          알려주세요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          이 정보는 비공개로 보관돼요. 저장하면 바로 사진 업로드로
          이어집니다.
        </p>
      </header>
      <ProfileForm
        initialProfile={profile}
        initialLoadFailed={Boolean(error)}
        successPath="/upload"
        submitLabel="저장하고 캐릭터 만들기"
      />
    </AppShell>
  );
}
