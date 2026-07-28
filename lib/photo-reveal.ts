import type { PhotoVisibility } from "@/lib/public-chat-profile";

export type PhotoRevealStatus = {
  conversationId: string;
  otherUserId: string;
  ownPhotoVisibility: PhotoVisibility;
  otherPhotoVisibility: PhotoVisibility;
  available: boolean;
  ownConsented: boolean;
  otherConsented: boolean;
  revealed: boolean;
};

function isPhotoVisibility(value: unknown): value is PhotoVisibility {
  return (
    value === "persona_only" ||
    value === "mutual" ||
    value === "public"
  );
}

export function getPhotoRevealStatusFromRecord(
  value: unknown,
): PhotoRevealStatus | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const conversationId =
    record.conversation_id ?? record.conversationId;
  const otherUserId = record.other_user_id ?? record.otherUserId;
  const ownPhotoVisibility =
    record.own_photo_visibility ?? record.ownPhotoVisibility;
  const otherPhotoVisibility =
    record.other_photo_visibility ?? record.otherPhotoVisibility;

  if (
    typeof conversationId !== "string" ||
    typeof otherUserId !== "string" ||
    !isPhotoVisibility(ownPhotoVisibility) ||
    !isPhotoVisibility(otherPhotoVisibility)
  ) {
    return null;
  }

  return {
    conversationId,
    otherUserId,
    ownPhotoVisibility,
    otherPhotoVisibility,
    available: record.available === true,
    ownConsented:
      (record.own_consented ?? record.ownConsented) === true,
    otherConsented:
      (record.other_consented ?? record.otherConsented) === true,
    revealed: record.revealed === true,
  };
}
