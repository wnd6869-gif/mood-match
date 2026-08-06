import type { DiscoverableProfile } from "@/lib/conversation-request";
import type { ConversationPreferences } from "@/lib/public-chat-profile";

export type RecommendationScore = {
  total: number;
  conversation: number;
  reasons: string[];
};

// A low threshold still requires a meaningful conversation overlap, without
// hiding every available person when the beta community is small.
export const RECOMMENDATION_MIN_SCORE = 28;

function overlapRatio(left: readonly string[], right: readonly string[]) {
  if (left.length === 0 || right.length === 0) return 0;
  const rightValues = new Set(right);
  return left.filter((value) => rightValues.has(value)).length /
    Math.max(1, Math.min(left.length, right.length));
}

/**
 * Conversation-first ranking. It deliberately does not inspect animal type,
 * visual traits, uploaded photo, or legacy visual preference records.
 */
export function calculateConversationRecommendationScore({
  candidate,
  conversationPreferences,
}: {
  candidate: DiscoverableProfile;
  conversationPreferences: ConversationPreferences;
}): RecommendationScore {
  const topicOverlap = overlapRatio(
    conversationPreferences.conversation_topics,
    candidate.conversation_topics,
  );
  const timeOverlap = overlapRatio(
    conversationPreferences.available_time_slots,
    candidate.available_time_slots,
  );
  const goalMatch =
    conversationPreferences.conversation_goal === candidate.conversation_goal
      ? 1
      : 0;
  const paceMatch =
    conversationPreferences.conversation_pace === candidate.conversation_pace
      ? 1
      : 0.45;
  const moodOverlap = overlapRatio(
    conversationPreferences.conversation_moods,
    candidate.conversation_moods,
  );
  const conversation = Math.round(
    (topicOverlap * 0.42 +
      timeOverlap * 0.24 +
      goalMatch * 0.2 +
      paceMatch * 0.1 +
      moodOverlap * 0.04) *
      100,
  );
  const reasons: string[] = [];
  if (topicOverlap > 0) reasons.push("관심사가 겹쳐요");
  if (timeOverlap > 0) reasons.push("대화하기 편한 시간이 비슷해요");
  if (goalMatch) reasons.push("대화의 방향이 비슷해요");
  if (paceMatch === 1) reasons.push("답장 스타일이 비슷해요");

  return { total: conversation, conversation, reasons: reasons.slice(0, 3) };
}
