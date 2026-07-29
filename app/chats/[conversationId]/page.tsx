import { notFound, redirect } from "next/navigation";
import ChatRoomView from "@/components/chat-room-view";
import {
  getChatMessageFromRecord,
  getConversationContextFromRecord,
  type ChatMessage,
} from "@/lib/chat";
import {
  getPhotoRevealStatusFromRecord,
} from "@/lib/photo-reveal";
import { createProfilePhotoSignedUrl } from "@/lib/supabase/profile-photo";
import { createClient } from "@/lib/supabase/server";
import { isCharacterRecipe } from "@/lib/persona-record";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  if (!UUID_PATTERN.test(conversationId)) {
    notFound();
  }

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

  const { data: contextData } = await supabase.rpc(
    "get_conversation_context",
    { target_conversation_id: conversationId },
  );
  const context = getConversationContextFromRecord(
    Array.isArray(contextData) ? contextData[0] : contextData,
  );

  if (!context) {
    notFound();
  }
  const recipeResponse = context.otherUserId
    ? await supabase.rpc("get_visible_avatar_recipes", { p_user_ids: [context.otherUserId] })
    : { data: [], error: null };
  const recipeRow = Array.isArray(recipeResponse.data) ? recipeResponse.data[0] : null;
  const otherCharacterRecipe = recipeRow && typeof recipeRow === "object" && "character_recipe" in recipeRow && isCharacterRecipe(recipeRow.character_recipe)
    ? recipeRow.character_recipe
    : undefined;
  context.otherCharacterRecipe = otherCharacterRecipe;

  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, message_type, body, created_at, deleted_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (messageError) {
    notFound();
  }

  const initialMessages = Array.isArray(messageData)
    ? messageData
        .map(getChatMessageFromRecord)
        .filter(
          (message): message is ChatMessage => message !== null,
        )
        .reverse()
    : [];
  const { data: photoRevealData } =
    context.conversationType === "direct"
      ? await supabase.rpc("get_photo_reveal_status", {
          target_conversation_id: conversationId,
        })
      : { data: null };
  const photoRevealStatus =
    getPhotoRevealStatusFromRecord(photoRevealData);
  const otherPhotoUrl =
    photoRevealStatus?.revealed === true
      ? await createProfilePhotoSignedUrl(
          supabase,
          photoRevealStatus.otherUserId,
        )
      : null;

  return (
    <ChatRoomView
      currentUserId={user.id}
      context={context}
      initialMessages={initialMessages}
      initialPhotoRevealStatus={photoRevealStatus}
      initialOtherPhotoUrl={otherPhotoUrl}
    />
  );
}
