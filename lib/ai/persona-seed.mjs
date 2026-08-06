import { createHash } from "node:crypto";

export function createPersonaCastingSeed(userId, objectPath, rerollNonce) {
  return createHash("sha256")
    .update(`${userId}:${objectPath}:${rerollNonce || "stable"}`)
    .digest("hex")
    .slice(0, 32);
}
