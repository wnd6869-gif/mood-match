import type { PersonaAnalysisResult } from "@/lib/persona-analysis";
import { isCharacterRecipe } from "@/lib/persona-record";
import type { CharacterRecipe } from "@/lib/character-casting";
import {
  getPublicChatProfileFromRecord,
  type PublicChatProfile,
} from "@/lib/public-chat-profile";

export const CONVERSATION_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;

export const CONVERSATION_REQUEST_DIRECTIONS = [
  "sent",
  "received",
] as const;

export type ConversationRequestStatus =
  (typeof CONVERSATION_REQUEST_STATUSES)[number];
export type ConversationRequestDirection =
  (typeof CONVERSATION_REQUEST_DIRECTIONS)[number];

export type DiscoverableProfile = Omit<PublicChatProfile, "id"> & {
  userId: string;
  public_nickname: string;
  personaTitle: string;
  personaDescription: string;
  animalTypes: PersonaAnalysisResult["animalTypes"];
  moodKeywords: string[];
  ageDisplay: string | null;
  requestId: string | null;
  requestStatus: ConversationRequestStatus | null;
  requestDirection: ConversationRequestDirection | null;
  characterRecipe: CharacterRecipe | null;
};

export type ConversationRequestListItem = {
  requestId: string;
  direction: ConversationRequestDirection;
  otherUserId: string;
  otherPublicNickname: string;
  otherPersonaTitle: string;
  message: string | null;
  startReason: ConversationStartReason | null;
  dailyCardSnapshot: ConversationStartReason | null;
  status: ConversationRequestStatus;
  createdAt: string;
  respondedAt: string | null;
};

export type ConversationStartReason = {
  kind:
    | "common_interest"
    | "shared_time"
    | "daily_question"
    | "daily_topic"
    | "character";
  value?: string;
  question?: string;
  topic?: string;
  customTopic?: string;
  personaTitle?: string;
};

function parseConversationStartReason(
  value: unknown,
): ConversationStartReason | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    ![
      "common_interest",
      "shared_time",
      "daily_question",
      "daily_topic",
      "character",
    ].includes(String(record.kind))
  ) {
    return null;
  }
  return {
    kind: record.kind as ConversationStartReason["kind"],
    value: typeof record.value === "string" ? record.value : undefined,
    question: typeof record.question === "string" ? record.question : undefined,
    topic: typeof record.topic === "string" ? record.topic : undefined,
    customTopic:
      typeof record.customTopic === "string" ? record.customTopic : undefined,
    personaTitle:
      typeof record.personaTitle === "string" ? record.personaTitle : undefined,
  };
}

export function getConversationStartReasonLabel(
  reason: ConversationStartReason | null,
) {
  if (!reason) return null;
  if (reason.kind === "common_interest" && reason.value) {
    return `공통 관심사: ${reason.value}`;
  }
  if (reason.kind === "shared_time" && reason.value) {
    return `대화 선호 시간대: ${reason.value}`;
  }
  if (reason.kind === "daily_question" && reason.question) {
    return `오늘 물어봐 주면 좋은 질문: ${reason.question}`;
  }
  if (reason.kind === "daily_topic") {
    return `오늘의 소재: ${reason.customTopic ?? reason.topic ?? ""}`;
  }
  if (reason.kind === "character" && reason.personaTitle) {
    return `${reason.personaTitle} 캐릭터 이야기`;
  }
  return "대화를 시작한 이유";
}

function isRequestStatus(
  value: unknown,
): value is ConversationRequestStatus {
  return CONVERSATION_REQUEST_STATUSES.includes(
    value as ConversationRequestStatus,
  );
}

function isRequestDirection(
  value: unknown,
): value is ConversationRequestDirection {
  return CONVERSATION_REQUEST_DIRECTIONS.includes(
    value as ConversationRequestDirection,
  );
}

function parseAnimalTypes(
  value: unknown,
): PersonaAnalysisResult["animalTypes"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is { name: string; score: number } =>
        Boolean(
          item &&
            typeof item === "object" &&
            "name" in item &&
            typeof item.name === "string" &&
            "score" in item &&
            typeof item.score === "number",
        ),
    )
    .slice(0, 3);
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string" && Boolean(item),
  );
}

export function getDiscoverableProfileFromRecord(
  value: unknown,
): DiscoverableProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const publicProfile = getPublicChatProfileFromRecord({
    id: record.user_id,
    public_nickname: record.public_nickname,
    public_bio: record.public_bio,
    is_public: true,
    age_visibility: "range",
    photo_visibility: record.photo_visibility,
    conversation_goal: record.conversation_goal,
    conversation_moods: record.conversation_moods,
    conversation_topics: record.conversation_topics,
    conversation_pace: record.conversation_pace,
    preferred_group_size: record.preferred_group_size,
    available_time_slots: record.available_time_slots,
  });

  if (
    !publicProfile ||
    !publicProfile.public_nickname ||
    typeof record.persona_title !== "string" ||
    typeof record.persona_description !== "string"
  ) {
    return null;
  }

  return {
    ...publicProfile,
    userId: publicProfile.id,
    public_nickname: publicProfile.public_nickname,
    personaTitle: record.persona_title,
    personaDescription: record.persona_description,
    animalTypes: parseAnimalTypes(record.animal_types),
    moodKeywords: parseStringArray(record.mood_keywords),
    ageDisplay:
      typeof record.age_display === "string"
        ? record.age_display
        : null,
    requestId:
      typeof record.request_id === "string" ? record.request_id : null,
    requestStatus: isRequestStatus(record.request_status)
      ? record.request_status
      : null,
    requestDirection: isRequestDirection(record.request_direction)
      ? record.request_direction
      : null,
    characterRecipe: isCharacterRecipe(record.character_recipe)
      ? record.character_recipe
      : null,
  };
}

export function getConversationRequestListItemFromRecord(
  value: unknown,
): ConversationRequestListItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.request_id !== "string" ||
    !isRequestDirection(record.direction) ||
    typeof record.other_user_id !== "string" ||
    !isRequestStatus(record.status) ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  return {
    requestId: record.request_id,
    direction: record.direction,
    otherUserId: record.other_user_id,
    otherPublicNickname:
      typeof record.other_public_nickname === "string"
        ? record.other_public_nickname
        : "알 수 없는 사용자",
    otherPersonaTitle:
      typeof record.other_persona_title === "string"
        ? record.other_persona_title
        : "캐릭터 정보 없음",
    message:
      typeof record.message === "string" ? record.message : null,
    startReason: parseConversationStartReason(record.start_reason),
    dailyCardSnapshot: parseConversationStartReason(record.daily_card_snapshot),
    status: record.status,
    createdAt: record.created_at,
    respondedAt:
      typeof record.responded_at === "string"
        ? record.responded_at
        : null,
  };
}

export function getConversationRequestStatusText(
  status: ConversationRequestStatus,
  direction: ConversationRequestDirection,
) {
  if (status === "pending") {
    return direction === "sent"
      ? "응답 기다리는 중"
      : "내 응답을 기다리고 있어요";
  }

  if (status === "accepted") {
    return "대화가 열렸어요";
  }

  if (status === "declined") {
    return "이번에는 대화가 이어지지 않았어요.";
  }

  return "보낸 인사를 취소했어요";
}

export function formatConversationRequestDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
