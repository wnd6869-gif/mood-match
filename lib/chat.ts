export type MessageType = "text" | "system";

export type ChatListItem = {
  conversationId: string;
  otherUserId: string;
  otherPublicNickname: string;
  otherPersonaTitle: string;
  otherMoodKeywords: string[];
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isMuted: boolean;
  unreadCount: number;
};

export type DirectConversationContext = {
  conversationId: string;
  otherUserId: string;
  otherPublicNickname: string;
  otherPersonaTitle: string;
  isMuted: boolean;
  isHidden: boolean;
  isBlocked: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: MessageType;
  body: string;
  createdAt: string;
  deletedAt: string | null;
};

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && Boolean(item),
  );
}

export function getChatListItemFromRecord(
  value: unknown,
): ChatListItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.conversation_id !== "string" ||
    typeof record.other_user_id !== "string" ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  return {
    conversationId: record.conversation_id,
    otherUserId: record.other_user_id,
    otherPublicNickname:
      typeof record.other_public_nickname === "string"
        ? record.other_public_nickname
        : "알 수 없는 사용자",
    otherPersonaTitle:
      typeof record.other_persona_title === "string"
        ? record.other_persona_title
        : "캐릭터 정보 없음",
    otherMoodKeywords: parseStringArray(record.other_mood_keywords),
    createdAt: record.created_at,
    lastMessageAt:
      typeof record.last_message_at === "string"
        ? record.last_message_at
        : null,
    lastMessagePreview:
      typeof record.last_message_preview === "string"
        ? record.last_message_preview
        : null,
    isMuted: record.is_muted === true,
    unreadCount:
      typeof record.unread_count === "number"
        ? Math.max(0, record.unread_count)
        : typeof record.unread_count === "string"
          ? Math.max(0, Number(record.unread_count) || 0)
          : 0,
  };
}

export function getDirectConversationContextFromRecord(
  value: unknown,
): DirectConversationContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.conversation_id !== "string" ||
    typeof record.other_user_id !== "string"
  ) {
    return null;
  }

  return {
    conversationId: record.conversation_id,
    otherUserId: record.other_user_id,
    otherPublicNickname:
      typeof record.other_public_nickname === "string"
        ? record.other_public_nickname
        : "알 수 없는 사용자",
    otherPersonaTitle:
      typeof record.other_persona_title === "string"
        ? record.other_persona_title
        : "캐릭터 정보 없음",
    isMuted: record.is_muted === true,
    isHidden: record.is_hidden === true,
    isBlocked: record.is_blocked === true,
  };
}

export function getChatMessageFromRecord(
  value: unknown,
): ChatMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    typeof record.conversation_id !== "string" ||
    typeof record.sender_id !== "string" ||
    (record.message_type !== "text" &&
      record.message_type !== "system") ||
    typeof record.body !== "string" ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    conversationId: record.conversation_id,
    senderId: record.sender_id,
    messageType: record.message_type,
    body: record.body,
    createdAt: record.created_at,
    deletedAt:
      typeof record.deleted_at === "string"
        ? record.deleted_at
        : null,
  };
}

export function formatChatListTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDate =
    date.toLocaleDateString("en-CA", {
      timeZone: "Asia/Seoul",
    }) ===
    now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Seoul",
    });

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    ...(sameDate
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

export function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
