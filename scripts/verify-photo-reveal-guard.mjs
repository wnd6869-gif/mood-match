import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const read = (file) => readFile(resolve(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [gateway, chatPage, chatHandlers, discoverPage, profilePhoto] = await Promise.all([
  read("app/api/photo-reveal/[conversationId]/route.ts"),
  read("app/chats/[conversationId]/page.tsx"),
  read("lib/api/chats/handlers.ts"),
  read("app/discover/[userId]/page.tsx"),
  read("lib/supabase/profile-photo.ts"),
]);

assert(gateway.includes("get_photo_reveal_status"), "Reveal gateway must recheck mutual consent.");
assert(gateway.includes("status?.revealed"), "Reveal gateway must block until both users consent.");
assert(gateway.includes("private, no-store"), "Reveal response must not be cached.");
assert(!chatPage.includes("createProfilePhotoSignedUrl"), "Chat page must not issue a storage signed URL.");
assert(!chatHandlers.includes("createProfilePhotoSignedUrl"), "Chat API must not issue a storage signed URL.");
assert(chatHandlers.includes("/api/photo-reveal/${body.conversationId}"), "Chat API must return the guarded route.");
assert(!discoverPage.includes('profile.photo_visibility !== "persona_only"'), "Discover must not reveal other members' photos.");
assert(profilePhoto.includes("createOwnProfilePhotoSignedUrl"), "Signed URLs must be restricted to the owner flow.");
assert(profilePhoto.includes("user?.id !== ownerUserId"), "Owner-only guard is required.");

console.log("photo reveal gateway guard verified");
