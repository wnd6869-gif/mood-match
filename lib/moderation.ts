export type UserModerationState = {
  status: "active" | "restricted" | "suspended" | "banned";
  reason: string | null;
  suspendedUntil: string | null;
};

export function getModerationStateFromRecord(
  value: unknown,
): UserModerationState {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const status =
    record.status === "restricted" ||
    record.status === "suspended" ||
    record.status === "banned"
      ? record.status
      : "active";

  return {
    status,
    reason:
      typeof record.reason === "string" ? record.reason : null,
    suspendedUntil:
      typeof record.suspended_until === "string"
        ? record.suspended_until
        : null,
  };
}
