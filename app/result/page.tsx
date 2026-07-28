import { redirect } from "next/navigation";
import PersonaResultView from "@/components/persona-result-view";
import {
  getPersonaResultFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import { createProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
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

  const photoUrl = await createProfilePhotoSignedUrl(
    supabase,
    user.id,
  );
  const { data } = await supabase
    .from("personas")
    .select(PERSONA_SELECT_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  const serverResult = getPersonaResultFromRecord(
    data as PersonaRecord | null,
  );

  return (
    <PersonaResultView
      photoUrl={photoUrl}
      userId={user.id}
      serverResult={serverResult}
    />
  );
}
