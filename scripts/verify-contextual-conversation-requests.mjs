import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const migration = await readFile(
  resolve(root, "supabase/migrations/20260806000600_contextual_conversation_requests.sql"),
  "utf8",
);
const route = await readFile(
  resolve(root, "app/api/conversation-requests/route.ts"),
  "utf8",
);
const requestButton = await readFile(
  resolve(root, "components/conversation-request-button.tsx"),
  "utf8",
);
const requestManager = await readFile(
  resolve(root, "components/requests-manager.tsx"),
  "utf8",
);

const requiredMigrationTokens = [
  "start_reason jsonb",
  "daily_card_snapshot jsonb",
  "expires_at timestamptz",
  "send_contextual_conversation_request",
  "accept_conversation_request_with_reply",
  "request_expired",
  "message_type, body, created_at",
  "common_interest",
  "shared_time",
  "daily_question",
  "daily_topic",
  "character",
  "daily_card_snapshot = v_daily_snapshot",
];
const requiredRouteTokens = [
  "send_contextual_conversation_request",
  "accept_conversation_request_with_reply",
  "reasonKind",
  "replyMessage",
  "request_expired",
];
const requiredUiTokens = [
  "직접 작성하기",
  "수락하고 답장하기",
  "selectedReason?.prompts",
  "reasonOptions.map",
];

for (const token of requiredMigrationTokens) {
  if (!migration.includes(token)) throw new Error(`migration token missing: ${token}`);
}
for (const token of requiredRouteTokens) {
  if (!route.includes(token)) throw new Error(`route token missing: ${token}`);
}
for (const token of requiredUiTokens) {
  if (!`${requestButton}\n${requestManager}`.includes(token)) {
    throw new Error(`ui token missing: ${token}`);
  }
}

console.log("contextual conversation request guard: ok");
