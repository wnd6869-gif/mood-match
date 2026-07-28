export function getSafeNextPath(
  value: string | null | undefined,
  fallback = "/home",
) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
