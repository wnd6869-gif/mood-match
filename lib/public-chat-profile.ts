export const AGE_VISIBILITY_OPTIONS = [
  { value: "hidden", label: "비공개" },
  { value: "range", label: "연령대만" },
  { value: "exact", label: "정확한 나이" },
] as const;

export const PHOTO_VISIBILITY_OPTIONS = [
  {
    value: "persona_only",
    label: "AI 캐릭터만 공개",
    description: "실제 사진 없이 AI 캐릭터 카드만 보여줘요.",
  },
  {
    value: "mutual",
    label: "서로 동의하면 실제 사진 공개",
    description:
      "1:1 채팅에서 두 사람이 각각 동의한 뒤에만 서로 공개해요.",
  },
  {
    value: "public",
    label: "처음부터 실제 사진 공개",
    description: "공개 프로필에서 실제 사진이 바로 보여요.",
  },
] as const;

export const CONVERSATION_GOAL_OPTIONS = [
  { value: "casual_chat", label: "가볍게 이야기하고 싶어요" },
  { value: "new_friends", label: "새로운 사람을 알아가고 싶어요" },
  { value: "hobby_chat", label: "취향이 비슷한 사람을 만나고 싶어요" },
  { value: "고민_나누기", label: "천천히 친해지고 싶어요" },
  {
    value: "relationship_open",
    label: "좋은 인연이 생기면 열려 있어요",
  },
] as const;

export const CONVERSATION_MOOD_OPTIONS = [
  { value: "편안한", label: "편안한" },
  { value: "유쾌한", label: "유쾌한" },
  { value: "차분한", label: "차분한" },
  { value: "다정한", label: "다정한" },
  { value: "솔직한", label: "솔직한" },
  { value: "깊이있는", label: "깊이 있는" },
  { value: "가벼운", label: "가벼운" },
  { value: "늦은밤감성", label: "늦은 밤 감성" },
] as const;

export const CONVERSATION_TOPIC_OPTIONS = [
  { value: "일상", label: "일상" },
  { value: "음악", label: "음악" },
  { value: "영화드라마", label: "영화·드라마" },
  { value: "여행", label: "여행" },
  { value: "음식", label: "음식" },
  { value: "운동", label: "운동" },
  { value: "게임", label: "게임" },
  { value: "책", label: "책" },
  { value: "연애", label: "관계 이야기" },
  { value: "고민", label: "고민" },
  { value: "직장", label: "직장" },
  { value: "아무말", label: "아무 말" },
] as const;

export const CONVERSATION_PACE_OPTIONS = [
  { value: "slow", label: "답장이 느려도 편한 대화" },
  { value: "balanced", label: "적당히 이어지는 대화" },
  { value: "fast", label: "빠르게 주고받는 대화" },
] as const;

export const GROUP_SIZE_OPTIONS = [
  { value: "one_to_one", label: "1:1 대화" },
  { value: "small_group", label: "4~6명 소규모 방" },
  { value: "both", label: "둘 다 괜찮음" },
] as const;

export const AVAILABLE_TIME_OPTIONS = [
  { value: "morning", label: "아침" },
  { value: "daytime", label: "낮" },
  { value: "evening", label: "저녁" },
  { value: "late_night", label: "늦은 밤" },
] as const;

export type AgeVisibility =
  (typeof AGE_VISIBILITY_OPTIONS)[number]["value"];
export type PhotoVisibility =
  (typeof PHOTO_VISIBILITY_OPTIONS)[number]["value"];
export type ConversationGoal =
  (typeof CONVERSATION_GOAL_OPTIONS)[number]["value"];
export type ConversationMood =
  (typeof CONVERSATION_MOOD_OPTIONS)[number]["value"];
export type ConversationTopic =
  (typeof CONVERSATION_TOPIC_OPTIONS)[number]["value"];
export type ConversationPace =
  (typeof CONVERSATION_PACE_OPTIONS)[number]["value"];
export type PreferredGroupSize =
  (typeof GROUP_SIZE_OPTIONS)[number]["value"];
export type AvailableTimeSlot =
  (typeof AVAILABLE_TIME_OPTIONS)[number]["value"];

export type PublicChatProfile = {
  id: string;
  public_nickname: string | null;
  public_bio: string | null;
  is_public: boolean;
  age_visibility: AgeVisibility;
  photo_visibility: PhotoVisibility;
  conversation_goal: ConversationGoal | null;
  conversation_moods: ConversationMood[];
  conversation_topics: ConversationTopic[];
  conversation_pace: ConversationPace | null;
  preferred_group_size: PreferredGroupSize | null;
  available_time_slots: AvailableTimeSlot[];
};

export type ConversationPreferences = Pick<
  PublicChatProfile,
  | "conversation_goal"
  | "conversation_moods"
  | "conversation_topics"
  | "conversation_pace"
  | "preferred_group_size"
  | "available_time_slots"
>;

export const PUBLIC_CHAT_PROFILE_SELECT_COLUMNS =
  "id, public_nickname, public_bio, is_public, age_visibility, photo_visibility, conversation_goal, conversation_moods, conversation_topics, conversation_pace, preferred_group_size, available_time_slots";

export const DEFAULT_PUBLIC_CHAT_PROFILE: Omit<
  PublicChatProfile,
  "id"
> = {
  public_nickname: null,
  public_bio: null,
  is_public: false,
  age_visibility: "range",
  photo_visibility: "persona_only",
  conversation_goal: null,
  conversation_moods: [],
  conversation_topics: [],
  conversation_pace: null,
  preferred_group_size: null,
  available_time_slots: [],
};

const BLOCKED_NICKNAME_TERMS = [
  "관리자",
  "운영자",
  "admin",
  "official",
  "시발",
  "씨발",
  "개새끼",
] as const;

function isOptionValue<T extends string>(
  value: unknown,
  options: readonly { value: T }[],
): value is T {
  return (
    typeof value === "string" &&
    options.some((option) => option.value === value)
  );
}

function parseOptionArray<T extends string>(
  value: unknown,
  options: readonly { value: T }[],
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((item) => isOptionValue(item, options))),
  );
}

export function getPublicChatProfileFromRecord(
  value: unknown,
): PublicChatProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.id !== "string") {
    return null;
  }

  return {
    id: record.id,
    public_nickname:
      typeof record.public_nickname === "string"
        ? record.public_nickname
        : null,
    public_bio:
      typeof record.public_bio === "string" ? record.public_bio : null,
    is_public: record.is_public === true,
    age_visibility: isOptionValue(
      record.age_visibility,
      AGE_VISIBILITY_OPTIONS,
    )
      ? record.age_visibility
      : "range",
    photo_visibility: isOptionValue(
      record.photo_visibility,
      PHOTO_VISIBILITY_OPTIONS,
    )
      ? record.photo_visibility
      : "persona_only",
    conversation_goal: isOptionValue(
      record.conversation_goal,
      CONVERSATION_GOAL_OPTIONS,
    )
      ? record.conversation_goal
      : null,
    conversation_moods: parseOptionArray(
      record.conversation_moods,
      CONVERSATION_MOOD_OPTIONS,
    ),
    conversation_topics: parseOptionArray(
      record.conversation_topics,
      CONVERSATION_TOPIC_OPTIONS,
    ),
    conversation_pace: isOptionValue(
      record.conversation_pace,
      CONVERSATION_PACE_OPTIONS,
    )
      ? record.conversation_pace
      : null,
    preferred_group_size: isOptionValue(
      record.preferred_group_size,
      GROUP_SIZE_OPTIONS,
    )
      ? record.preferred_group_size
      : null,
    available_time_slots: parseOptionArray(
      record.available_time_slots,
      AVAILABLE_TIME_OPTIONS,
    ),
  };
}

export function getPublicNicknameError(value: string) {
  const normalized = value.trim();

  if (normalized.length < 2 || normalized.length > 20) {
    return "공개 닉네임은 2자 이상 20자 이하로 입력해주세요.";
  }

  const compact = normalized.replace(/\s/g, "").toLowerCase();

  if (!compact) {
    return "공개 닉네임은 공백만 입력할 수 없어요.";
  }

  if (BLOCKED_NICKNAME_TERMS.some((term) => compact.includes(term))) {
    return "사용할 수 없는 표현이 포함되어 있어요.";
  }

  return null;
}

export function getAgeDisplay(
  birthDate: string | null,
  visibility: AgeVisibility,
) {
  if (!birthDate || visibility === "hidden") {
    return null;
  }

  const [year, month, day] = birthDate.split("-").map(Number);
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const currentYear = Number(
    todayParts.find((part) => part.type === "year")?.value,
  );
  const currentMonth = Number(
    todayParts.find((part) => part.type === "month")?.value,
  );
  const currentDay = Number(
    todayParts.find((part) => part.type === "day")?.value,
  );

  if (!year || !month || !day || year > currentYear) {
    return null;
  }

  let age = currentYear - year;

  if (
    currentMonth < month ||
    (currentMonth === month && currentDay < day)
  ) {
    age -= 1;
  }

  if (age < 0) {
    return null;
  }

  if (visibility === "exact") {
    return `${age}세`;
  }

  return `${Math.floor(age / 10) * 10}대`;
}

export function hasCompleteConversationPreferences(
  value: ConversationPreferences,
) {
  return (
    Boolean(value.conversation_goal) &&
    value.conversation_moods.length >= 1 &&
    value.conversation_moods.length <= 4 &&
    value.conversation_topics.length >= 1 &&
    value.conversation_topics.length <= 6 &&
    Boolean(value.conversation_pace) &&
    Boolean(value.preferred_group_size) &&
    value.available_time_slots.length >= 1 &&
    value.available_time_slots.length <= 4
  );
}

export function findOptionLabel<T extends string>(
  value: T | null,
  options: readonly { value: T; label: string }[],
) {
  if (!value) {
    return null;
  }

  return options.find((option) => option.value === value)?.label ?? null;
}
