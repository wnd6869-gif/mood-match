export type MessageType = "text" | "system";
export type ConversationType = "direct" | "group";
export type ConversationRole = "owner" | "admin" | "member";

export type ConversationMember = {
  userId: string;
  publicNickname: string;
  personaTitle: string;
  role: ConversationRole;
};

export type ChatListItem = {
  conversationId: string;
  conversationType: ConversationType;
  conversationTitle: string | null;
  memberCount: number;
  otherUserId: string | null;
  otherPublicNickname: string;
  otherPersonaTitle: string;
  otherMoodKeywords: string[];
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isMuted: boolean;
  unreadCount: number;
  characterRecipe?: unknown;
};

export type ConversationContext = {
  conversationId: string;
  conversationType: ConversationType;
  conversationTitle: string | null;
  currentUserRole: ConversationRole;
  members: ConversationMember[];
  otherUserId: string | null;
  otherPublicNickname: string;
  otherPersonaTitle: string;
  isMuted: boolean;
  isHidden: boolean;
  isBlocked: boolean;
  otherCharacterRecipe?: unknown;
};

export type GroupChatCandidate = {
  userId: string;
  publicNickname: string;
  personaTitle: string;
  moodKeywords: string[];
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

function isConversationRole(value: unknown): value is ConversationRole {
  return value === "owner" || value === "admin" || value === "member";
}

function parseConversationMembers(value: unknown): ConversationMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      if (typeof record.user_id !== "string") {
        return null;
      }

      return {
        userId: record.user_id,
        publicNickname:
          typeof record.public_nickname === "string"
            ? record.public_nickname
            : "알 수 없는 사용자",
        personaTitle:
          typeof record.persona_title === "string"
            ? record.persona_title
            : "캐릭터 정보 없음",
        role: isConversationRole(record.role)
          ? record.role
          : "member",
      } satisfies ConversationMember;
    })
    .filter(
      (member): member is ConversationMember => member !== null,
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
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  const conversationType: ConversationType =
    record.conversation_type === "group" ? "group" : "direct";

  if (
    conversationType === "direct" &&
    typeof record.other_user_id !== "string"
  ) {
    return null;
  }

  return {
    conversationId: record.conversation_id,
    conversationType,
    conversationTitle:
      typeof record.conversation_title === "string"
        ? record.conversation_title
        : null,
    memberCount:
      typeof record.member_count === "number"
        ? Math.max(0, record.member_count)
        : typeof record.member_count === "string"
          ? Math.max(0, Number(record.member_count) || 0)
          : conversationType === "direct"
            ? 2
            : 0,
    otherUserId:
      typeof record.other_user_id === "string"
        ? record.other_user_id
        : null,
    otherPublicNickname:
      typeof record.other_public_nickname === "string"
        ? record.other_public_nickname
        : conversationType === "group"
          ? "단체방"
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
    characterRecipe: record.other_character_recipe,
  };
}

export function getConversationContextFromRecord(
  value: unknown,
): ConversationContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.conversation_id !== "string") {
    return null;
  }

  const conversationType: ConversationType =
    record.conversation_type === "group" ? "group" : "direct";
  const members = parseConversationMembers(record.members);
  const otherUserId =
    typeof record.other_user_id === "string"
      ? record.other_user_id
      : null;

  if (conversationType === "direct" && !otherUserId) {
    return null;
  }

  return {
    conversationId: record.conversation_id,
    conversationType,
    conversationTitle:
      typeof record.conversation_title === "string"
        ? record.conversation_title
        : null,
    currentUserRole: isConversationRole(record.current_user_role)
      ? record.current_user_role
      : "member",
    members,
    otherUserId,
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
    otherCharacterRecipe: record.other_character_recipe,
  };
}

export function getGroupChatCandidateFromRecord(
  value: unknown,
): GroupChatCandidate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.user_id !== "string") {
    return null;
  }

  return {
    userId: record.user_id,
    publicNickname:
      typeof record.public_nickname === "string"
        ? record.public_nickname
        : "알 수 없는 사용자",
    personaTitle:
      typeof record.persona_title === "string"
        ? record.persona_title
        : "캐릭터 정보 없음",
    moodKeywords: parseStringArray(record.mood_keywords),
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
