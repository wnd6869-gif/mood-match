import { redirect } from "next/navigation";
import PersonaResultView from "@/components/persona-result-view";
import {
  getPersonaResultFromRecord,
  getCharacterCompositionFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
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

  const [{ data }, { data: profileData }] = await Promise.all([
    supabase
      .from("personas")
      .select(PERSONA_SELECT_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("public_nickname")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const serverResult = getPersonaResultFromRecord(
    data as PersonaRecord | null,
  );
  const serverComposition = getCharacterCompositionFromRecord(
    data as PersonaRecord | null,
  );

  return (
    <PersonaResultView
      userId={user.id}
      serverResult={serverResult}
      serverComposition={serverComposition}
      personaIdentity={
        profileData &&
        typeof profileData.public_nickname === "string"
          ? profileData.public_nickname
          : null
      }
    />
  );
}
