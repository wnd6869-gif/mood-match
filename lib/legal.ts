export const TERMS_VERSION = "2026-07-28-beta-1";
export const PRIVACY_VERSION = "2026-07-28-beta-1";
export const LEGAL_EFFECTIVE_DATE = "2026년 7월 28일";

// TODO(운영자): 베타 공개 전에 아래 환경변수를 실제 사업자·운영자 정보로
// 확정하세요. 값이 없으면 법적 문서에 "운영자가 확정해야 함"으로 표시됩니다.
export const LEGAL_OPERATOR = {
  serviceName: process.env.NEXT_PUBLIC_SERVICE_NAME?.trim() || "Mood Match",
  businessName:
    process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME?.trim() ||
    "운영자가 확정해야 함",
  representative:
    process.env.NEXT_PUBLIC_LEGAL_REPRESENTATIVE?.trim() ||
    "운영자가 확정해야 함",
  address:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS?.trim() ||
    "운영자가 확정해야 함",
  contactEmail:
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() ||
    "운영자가 확정해야 함",
  privacyOfficer:
    process.env.NEXT_PUBLIC_LEGAL_PRIVACY_OFFICER?.trim() ||
    "운영자가 확정해야 함",
} as const;

export function getContactHref() {
  return LEGAL_OPERATOR.contactEmail.includes("@")
    ? `mailto:${LEGAL_OPERATOR.contactEmail}`
    : "/privacy#contact";
}
