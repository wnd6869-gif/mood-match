export const PHOTO_ELIGIBILITY_REASON_CODES = [
  "ok",
  "no_person",
  "multiple_people",
  "face_too_small",
  "face_not_front_facing",
  "eyes_not_clear",
  "nose_not_clear",
  "mouth_not_clear",
  "face_blurry_or_dark",
  "face_occluded",
  "unsupported_image",
] as const;

export type PhotoEligibilityReasonCode =
  (typeof PHOTO_ELIGIBILITY_REASON_CODES)[number];

export type PhotoEligibility = {
  isEligible: boolean;
  personCount: number;
  faceLargeEnough: boolean;
  faceSharpEnough: boolean;
  faceFrontFacing: boolean;
  leftEyeVisible: boolean;
  rightEyeVisible: boolean;
  noseVisible: boolean;
  mouthVisible: boolean;
  reasonCode: PhotoEligibilityReasonCode;
};

export function parsePhotoEligibility(
  value: unknown,
): PhotoEligibility | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const booleanFields = [
    "isEligible",
    "faceLargeEnough",
    "faceSharpEnough",
    "faceFrontFacing",
    "leftEyeVisible",
    "rightEyeVisible",
    "noseVisible",
    "mouthVisible",
  ] as const;

  if (
    !booleanFields.every(
      (field) => typeof candidate[field] === "boolean",
    ) ||
    typeof candidate.personCount !== "number" ||
    !Number.isInteger(candidate.personCount) ||
    candidate.personCount < 0 ||
    candidate.personCount > 10 ||
    typeof candidate.reasonCode !== "string" ||
    !PHOTO_ELIGIBILITY_REASON_CODES.includes(
      candidate.reasonCode as PhotoEligibilityReasonCode,
    )
  ) {
    return null;
  }

  return {
    isEligible: candidate.isEligible as boolean,
    personCount: candidate.personCount,
    faceLargeEnough: candidate.faceLargeEnough as boolean,
    faceSharpEnough: candidate.faceSharpEnough as boolean,
    faceFrontFacing: candidate.faceFrontFacing as boolean,
    leftEyeVisible: candidate.leftEyeVisible as boolean,
    rightEyeVisible: candidate.rightEyeVisible as boolean,
    noseVisible: candidate.noseVisible as boolean,
    mouthVisible: candidate.mouthVisible as boolean,
    reasonCode: candidate.reasonCode as PhotoEligibilityReasonCode,
  };
}

export function isPhotoEligible(photo: PhotoEligibility) {
  return (
    photo.isEligible &&
    photo.personCount === 1 &&
    photo.faceLargeEnough &&
    photo.faceSharpEnough &&
    photo.faceFrontFacing &&
    photo.leftEyeVisible &&
    photo.rightEyeVisible &&
    photo.noseVisible &&
    photo.mouthVisible &&
    photo.reasonCode === "ok"
  );
}

export function getPhotoEligibilityErrorMessage(
  photo: PhotoEligibility,
) {
  if (photo.personCount === 0 || photo.reasonCode === "no_person") {
    return "사진에서 사람을 찾지 못했어요. 한 명만 나온 얼굴 사진을 선택해주세요.";
  }

  if (
    photo.personCount !== 1 ||
    photo.reasonCode === "multiple_people"
  ) {
    return "사진에 여러 사람이 보여요. 한 명만 나온 사진을 선택해주세요.";
  }

  if (
    !photo.faceLargeEnough ||
    photo.reasonCode === "face_too_small"
  ) {
    return "얼굴이 너무 작게 보여요. 얼굴이 화면에 크게 나온 사진을 선택해주세요.";
  }

  if (
    !photo.faceFrontFacing ||
    photo.reasonCode === "face_not_front_facing"
  ) {
    return "두 눈이 모두 보이는 정면 또는 준정면 얼굴 사진을 선택해주세요.";
  }

  if (
    !photo.leftEyeVisible ||
    !photo.rightEyeVisible ||
    photo.reasonCode === "eyes_not_clear"
  ) {
    return "두 눈이 모두 선명하게 보이는 사진을 선택해주세요. 선글라스나 머리카락으로 가린 사진은 사용할 수 없어요.";
  }

  if (!photo.noseVisible || photo.reasonCode === "nose_not_clear") {
    return "코가 선명하게 보이는 얼굴 사진을 선택해주세요.";
  }

  if (
    !photo.mouthVisible ||
    photo.reasonCode === "mouth_not_clear"
  ) {
    return "입이 선명하게 보이는 사진을 선택해주세요. 마스크나 손으로 가린 사진은 사용할 수 없어요.";
  }

  if (
    !photo.faceSharpEnough ||
    photo.reasonCode === "face_blurry_or_dark"
  ) {
    return "얼굴이 흐리거나 어두워요. 밝고 초점이 선명한 사진을 선택해주세요.";
  }

  if (photo.reasonCode === "face_occluded") {
    return "얼굴 일부가 가려져 있어요. 두 눈·코·입이 모두 보이는 사진을 선택해주세요.";
  }

  return "한 명의 얼굴과 두 눈·코·입이 모두 선명하게 보이는 사진을 선택해주세요.";
}
