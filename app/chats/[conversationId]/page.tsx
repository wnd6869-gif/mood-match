import { notFound, redirect } from "next/navigation";
import ChatRoomView from "@/components/chat-room-view";
import {
  getChatMessageFromRecord,
  getDirectConversationContextFromRecord,
  type ChatMessage,
} from "@/lib/chat";
import { createClient } from "@/lib/supabase/server";

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
    "get_direct_conversation_context",
    { target_conversation_id: conversationId },
  );
  const context = getDirectConversationContextFromRecord(
    Array.isArray(contextData) ? contextData[0] : contextData,
  );

  if (!context) {
    notFound();
  }

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

  return (
    <ChatRoomView
      currentUserId={user.id}
      context={context}
      initialMessages={initialMessages}
    />
  );
}
