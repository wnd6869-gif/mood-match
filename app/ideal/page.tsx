import { redirect } from "next/navigation";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import MatchPreferencesForm from "@/components/match-preferences-form";
import StepProgress from "@/components/step-progress";
import { getMatchPreferenceFromRecord } from "@/lib/match-preference";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function IdealPage() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login?next=/ideal");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/ideal");
  }

  const { data } = await supabase
    .from("match_preferences")
    .select(
      "user_id, visual_archetype, preferred_animal, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const preference = getMatchPreferenceFromRecord(data);

  return (
    <AppShell>
      <BackLink
        href="/result"
        ariaLabel="동물 캐릭터 결과로 돌아가기"
        label="캐릭터 결과"
      />
      <StepProgress current={4} total={5} label="관심 스타일" />

      <header className="mt-7">
        <p className="text-sm font-semibold text-coral-600">
          추천 취향 설정
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          어떤 캐릭터와
          <br />
          이야기하고 싶나요?
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          선택값은 계정에 안전하게 저장되고 실제 공개 사용자 추천에
          사용돼요. 동물상보다 대화 분위기를 더 중요하게 봅니다.
        </p>
      </header>

      <MatchPreferencesForm
        userId={user.id}
        initialPreference={preference}
      />
    </AppShell>
  );
}
