import {
  calculateVisualMatchScore,
  deriveVisualTraitsFromAnimalTypes,
  isPreferredAnimal,
  isVisualArchetype,
  type PreferredAnimal,
  type VisualArchetype,
} from "@/lib/animal-archetypes";
import type { DiscoverableProfile } from "@/lib/conversation-request";
import type { ConversationPreferences } from "@/lib/public-chat-profile";

export type MatchPreference = {
  user_id: string;
  visual_archetype: VisualArchetype;
  preferred_animal: PreferredAnimal | null;
  created_at?: string;
  updated_at?: string;
};

export type RecommendationScore = {
  total: number;
  character: number;
  conversation: number;
  reasons: string[];
};

export const RECOMMENDATION_MIN_SCORE = 48;

export function getMatchPreferenceFromRecord(
  value: unknown,
): MatchPreference | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.user_id !== "string" ||
    !isVisualArchetype(record.visual_archetype)
  ) {
    return null;
  }

  return {
    user_id: record.user_id,
    visual_archetype: record.visual_archetype,
    preferred_animal: isPreferredAnimal(record.preferred_animal)
      ? record.preferred_animal
      : null,
    created_at:
      typeof record.created_at === "string"
        ? record.created_at
        : undefined,
    updated_at:
      typeof record.updated_at === "string"
        ? record.updated_at
        : undefined,
  };
}

function overlapRatio(left: readonly string[], right: readonly string[]) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightValues = new Set(right);
  const overlap = left.filter((value) => rightValues.has(value)).length;

  return overlap / Math.max(1, Math.min(left.length, right.length));
}

export function calculateRecommendationScore({
  candidate,
  matchPreference,
  conversationPreferences,
}: {
  candidate: DiscoverableProfile;
  matchPreference: MatchPreference;
  conversationPreferences: ConversationPreferences;
}): RecommendationScore {
  const character = calculateVisualMatchScore({
    candidateTraits: deriveVisualTraitsFromAnimalTypes(
      candidate.animalTypes,
    ),
    candidateAnimalTypes: candidate.animalTypes,
    preferredArchetype: matchPreference.visual_archetype,
    preferredAnimal: matchPreference.preferred_animal ?? undefined,
  });
  const moodOverlap = overlapRatio(
    conversationPreferences.conversation_moods,
    candidate.conversation_moods,
  );
  const topicOverlap = overlapRatio(
    conversationPreferences.conversation_topics,
    candidate.conversation_topics,
  );
  const timeOverlap = overlapRatio(
    conversationPreferences.available_time_slots,
    candidate.available_time_slots,
  );
  const goalMatch =
    conversationPreferences.conversation_goal ===
    candidate.conversation_goal
      ? 1
      : 0;
  const paceMatch =
    conversationPreferences.conversation_pace ===
    candidate.conversation_pace
      ? 1
      : 0.45;
  const conversation = Math.round(
    (moodOverlap * 0.25 +
      topicOverlap * 0.3 +
      timeOverlap * 0.2 +
      goalMatch * 0.15 +
      paceMatch * 0.1) *
      100,
  );
  const total = Math.round(character * 0.4 + conversation * 0.6);
  const reasons: string[] = [];

  if (character >= 65) {
    reasons.push("선택한 캐릭터 분위기와 가까워요");
  }
  if (topicOverlap > 0) {
    reasons.push("함께 이야기할 관심사가 있어요");
  }
  if (timeOverlap > 0) {
    reasons.push("주로 접속하는 시간이 겹쳐요");
  }
  if (moodOverlap > 0) {
    reasons.push("원하는 대화 분위기가 비슷해요");
  }
  if (goalMatch) {
    reasons.push("대화 목적이 같아요");
  }

  return {
    total,
    character,
    conversation,
    reasons: reasons.slice(0, 3),
  };
}
