export const ADMIN_ROLES = [
  "moderator",
  "admin",
  "super_admin",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const MODERATION_STATUSES = [
  "active",
  "restricted",
  "suspended",
  "banned",
] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const MODERATION_STATUS_LABELS: Record<
  ModerationStatus,
  string
> = {
  active: "정상",
  restricted: "제한",
  suspended: "정지",
  banned: "차단",
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  moderator: "모더레이터",
  admin: "관리자",
  super_admin: "최고 관리자",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export function isModerationStatus(
  value: unknown,
): value is ModerationStatus {
  return MODERATION_STATUSES.includes(value as ModerationStatus);
}
