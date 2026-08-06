import { redirect } from "next/navigation";
import PersonaResultView from "@/components/persona-result-view";
import {
  getPersonaResultFromRecord,
  getCharacterCompositionFromRecord,
  getCharacterRecipeFromRecord,
  PERSONA_SELECT_COLUMNS,
  type PersonaRecord,
} from "@/lib/persona-record";
import { createClient } from "@/lib/supabase/server";
import {
  getPublicChatProfileFromRecord,
  hasCompleteConversationPreferences,
  PUBLIC_CHAT_PROFILE_SELECT_COLUMNS,
} from "@/lib/public-chat-profile";

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
      .select(PUBLIC_CHAT_PROFILE_SELECT_COLUMNS)
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const serverResult = getPersonaResultFromRecord(
    data as PersonaRecord | null,
  );
  const serverComposition = getCharacterCompositionFromRecord(
    data as PersonaRecord | null,
  );
  const serverRecipe = getCharacterRecipeFromRecord(data as PersonaRecord | null);
  const conversationProfile = getPublicChatProfileFromRecord(profileData);
  const hasCompleteConversationProfile = Boolean(
    conversationProfile &&
      hasCompleteConversationPreferences({
        conversation_goal: conversationProfile.conversation_goal,
        conversation_moods: conversationProfile.conversation_moods,
        conversation_topics: conversationProfile.conversation_topics,
        conversation_pace: conversationProfile.conversation_pace,
        preferred_group_size: conversationProfile.preferred_group_size,
        available_time_slots: conversationProfile.available_time_slots,
      }),
  );

  return (
    <PersonaResultView
      userId={user.id}
      serverResult={serverResult}
      serverComposition={serverComposition}
      serverRecipe={serverRecipe}
      personaIdentity={
        conversationProfile?.public_nickname ?? null
      }
      hasCompleteConversationProfile={hasCompleteConversationProfile}
    />
  );
}
