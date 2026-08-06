export const DAILY_CONVERSATION_TOPICS = [
  "recently_enjoyed",
  "watching_now",
  "weekend_plan",
  "currently_into",
  "custom",
] as const;

export type DailyConversationTopic =
  (typeof DAILY_CONVERSATION_TOPICS)[number];

export const DAILY_CONVERSATION_TOPIC_LABELS: Record<
  DailyConversationTopic,
  string
> = {
  recently_enjoyed: "최근 먹은 것",
  watching_now: "보고 있는 것",
  weekend_plan: "주말 계획",
  currently_into: "요즘 빠진 것",
  custom: "직접 작성",
};

export type DailyConversationCard = {
  userId: string;
  cardDate: string;
  question: string | null;
  topic: DailyConversationTopic | null;
  customTopic: string | null;
  skipped: boolean;
};

export function getKstDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function isTopic(value: unknown): value is DailyConversationTopic {
  return DAILY_CONVERSATION_TOPICS.includes(value as DailyConversationTopic);
}

export function getDailyConversationCardFromRecord(
  value: unknown,
): DailyConversationCard | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const userId = record.user_id ?? record.userId;
  const cardDate = record.card_date ?? record.cardDate;
  const question = record.question;
  const topic = record.topic;
  const customTopic = record.custom_topic ?? record.customTopic;

  if (typeof userId !== "string" || typeof cardDate !== "string") return null;

  return {
    userId,
    cardDate,
    question: typeof question === "string" ? question : null,
    topic: isTopic(topic) ? topic : null,
    customTopic: typeof customTopic === "string" ? customTopic : null,
    skipped: record.skipped === true,
  };
}

export function getDailyConversationTopicLabel(card: DailyConversationCard) {
  if (card.topic === "custom") return card.customTopic;
  return card.topic ? DAILY_CONVERSATION_TOPIC_LABELS[card.topic] : null;
}
