export const RESTRICTED_MODERATION_STATUSES = Object.freeze([
  "restricted",
  "suspended",
  "banned",
]);

export function shouldRedirectModeratedUser(status) {
  return RESTRICTED_MODERATION_STATUSES.includes(status);
}
