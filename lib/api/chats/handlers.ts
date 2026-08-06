import type { User } from "@supabase/supabase-js";
import { jsonNoStore } from "@/lib/api/json";
import { getChatMessageFromRecord, type ChatMessage } from "@/lib/chat";
import { getPhotoRevealStatusFromRecord } from "@/lib/photo-reveal";
import { isReportReason } from "@/lib/safety";
import type { createClient } from "@/lib/supabase/server";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export type ChatRequestBody = {
  action?: unknown;
  requestId?: unknown;
  conversationId?: unknown;
  message?: unknown;
  groupTitle?: unknown;
  memberIds?: unknown;
  setting?: unknown;
  targetUserId?: unknown;
  reason?: unknown;
  details?: unknown;
  messageId?: unknown;
  consent?: unknown;
  cursor?: unknown;
};

type HandlerContext = {
  supabase: Supabase;
  user: User;
  body: ChatRequestBody;
};

type ChatAction =
  | "create"
  | "create-group"
  | "history"
  | "send"
  | "photo-status"
  | "photo-consent"
  | "setting"
  | "block"
  | "report";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SETTING_ACTIONS = ["read", "mute", "unmute", "hide", "unhide", "leave"] as const;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function parseCursor(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.createdAt !== "string" ||
    Number.isNaN(Date.parse(candidate.createdAt)) ||
    !isUuid(candidate.id)
  ) return null;
  return { createdAt: candidate.createdAt, id: candidate.id };
}

function rpcError(message: string | undefined) {
  if (message === "accepted_request_required" || message === "active_membership_required") {
    return jsonNoStore({ error: "이 채팅을 이용할 권한이 없어요." }, 403);
  }
  if (message === "user_blocked" || message === "user_unavailable") {
    return jsonNoStore({ error: "현재 이 사용자와 메시지를 주고받을 수 없어요." }, 403);
  }
  if (message === "other_member_left") {
    return jsonNoStore({ error: "대화할 다른 멤버가 없어 메시지를 보낼 수 없어요." }, 409);
  }
  if (message === "invalid_group_title" || message === "invalid_group_size" ||
      message === "invalid_group_members" || message === "blocked_group_members" ||
      message === "empty_message" || message === "message_too_long" ||
      message === "invalid_setting_action" || message === "invalid_block_target" ||
      message === "invalid_report_target" || message === "invalid_report_reason" ||
      message === "report_details_too_long") {
    return jsonNoStore({ error: "요청 내용을 다시 확인해주세요." }, 400);
  }
  if (message === "direct_conversation_required" || message === "mutual_photo_setting_required") {
    return jsonNoStore({ error: "사진 공개 설정을 확인해주세요." }, 409);
  }
  return jsonNoStore({ error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요." }, 500);
}

async function handleCreateChat({ supabase, body }: HandlerContext) {
  if (!isUuid(body.requestId)) return jsonNoStore({ error: "대화 요청 정보가 올바르지 않아요." }, 400);
  const { data, error } = await supabase.rpc("create_direct_conversation_from_request", { request_id: body.requestId });
  if (error) return rpcError(error.message);
  if (typeof data !== "string") return jsonNoStore({ error: "생성된 채팅방을 확인하지 못했어요." }, 500);
  const { error: unhideError } = await supabase.rpc("update_my_conversation_settings", {
    target_conversation_id: data,
    setting_action: "unhide",
  });
  if (unhideError) return rpcError(unhideError.message);
  return jsonNoStore({ conversationId: data });
}

async function handleCreateGroup({ supabase, user, body }: HandlerContext) {
  const groupTitle = typeof body.groupTitle === "string" ? body.groupTitle.trim() : "";
  const memberIds = Array.isArray(body.memberIds)
    ? Array.from(new Set(body.memberIds.filter((id): id is string => isUuid(id) && id !== user.id)))
    : [];
  if (groupTitle.length < 2 || groupTitle.length > 30 || memberIds.length < 2 || memberIds.length > 5) {
    return jsonNoStore({ error: "방 이름과 참여 인원을 확인해주세요." }, 400);
  }
  const { data, error } = await supabase.rpc("create_group_conversation", { room_title: groupTitle, member_ids: memberIds });
  if (error) return rpcError(error.message);
  return typeof data === "string"
    ? jsonNoStore({ conversationId: data })
    : jsonNoStore({ error: "생성된 단체방을 확인하지 못했어요." }, 500);
}

async function handleHistory({ supabase, body }: HandlerContext) {
  if (!isUuid(body.conversationId)) return jsonNoStore({ error: "채팅방 정보가 올바르지 않아요." }, 400);
  const cursor = parseCursor(body.cursor);
  if (!cursor) return jsonNoStore({ error: "이전 메시지 기준이 올바르지 않아요." }, 400);
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, message_type, body, created_at, deleted_at")
    .eq("conversation_id", body.conversationId)
    .or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(51);
  if (error) return jsonNoStore({ error: "이전 메시지를 불러오지 못했어요." }, 500);
  const rows = Array.isArray(data) ? data : [];
  const messages = rows.slice(0, 50).map(getChatMessageFromRecord)
    .filter((message): message is ChatMessage => message !== null).reverse();
  const oldest = messages[0] ?? null;
  return jsonNoStore({
    messages,
    hasOlderMessages: rows.length > 50,
    nextCursor: oldest ? { createdAt: oldest.createdAt, id: oldest.id } : null,
  });
}

async function handleSendMessage({ supabase, body }: HandlerContext) {
  if (!isUuid(body.conversationId) || typeof body.message !== "string") {
    return jsonNoStore({ error: "메시지 형식이 올바르지 않아요." }, 400);
  }
  const message = body.message.trim();
  if (!message || message.length > 1000) return jsonNoStore({ error: "메시지는 1~1000자로 입력해주세요." }, 400);
  const { data, error } = await supabase.rpc("send_message", {
    target_conversation_id: body.conversationId,
    message_body: message,
  });
  if (error) return rpcError(error.message);
  const record = getChatMessageFromRecord(Array.isArray(data) ? data[0] : data);
  return record
    ? jsonNoStore({ message: record })
    : jsonNoStore({ error: "전송한 메시지를 확인하지 못했어요." }, 500);
}

async function handlePhoto({ supabase, body }: HandlerContext) {
  if (!isUuid(body.conversationId)) return jsonNoStore({ error: "채팅방 정보가 올바르지 않아요." }, 400);
  const isConsent = body.action === "photo-consent";
  if (isConsent && typeof body.consent !== "boolean") return jsonNoStore({ error: "사진 공개 동의 값이 올바르지 않아요." }, 400);
  const { data, error } = await supabase.rpc(
    isConsent ? "set_photo_reveal_consent" : "get_photo_reveal_status",
    isConsent
      ? { target_conversation_id: body.conversationId, next_consented: body.consent }
      : { target_conversation_id: body.conversationId },
  );
  if (error) return rpcError(error.message);
  const status = getPhotoRevealStatusFromRecord(data);
  if (!status) return jsonNoStore({ error: "사진 공개 상태를 확인하지 못했어요." }, 500);
  // This is an authenticated gateway, not a Supabase signed URL. It checks
  // mutual consent again at image-request time so a revoked consent hides the
  // photo immediately for subsequent loads.
  const photoUrl = status.revealed
    ? `/api/photo-reveal/${body.conversationId}`
    : null;
  return jsonNoStore({ status, photoUrl });
}

async function handleSetting({ supabase, body }: HandlerContext) {
  if (!isUuid(body.conversationId) || typeof body.setting !== "string" ||
      !SETTING_ACTIONS.includes(body.setting as (typeof SETTING_ACTIONS)[number])) {
    return jsonNoStore({ error: "채팅 설정 형식이 올바르지 않아요." }, 400);
  }
  const { error } = await supabase.rpc("update_my_conversation_settings", {
    target_conversation_id: body.conversationId,
    setting_action: body.setting,
  });
  return error ? rpcError(error.message) : jsonNoStore({ message: "채팅 설정을 변경했어요." });
}

async function handleBlock({ supabase, user, body }: HandlerContext) {
  if (!isUuid(body.conversationId) || !isUuid(body.targetUserId) || body.targetUserId === user.id) {
    return jsonNoStore({ error: "차단할 사용자 정보가 올바르지 않아요." }, 400);
  }
  const { error } = await supabase.rpc("block_chat_user", {
    target_user_id: body.targetUserId,
    target_conversation_id: body.conversationId,
  });
  return error ? rpcError(error.message) : jsonNoStore({ message: "사용자를 차단하고 채팅을 숨겼어요." });
}

async function handleReport({ supabase, user, body }: HandlerContext) {
  if (!isUuid(body.conversationId) || !isUuid(body.targetUserId) || body.targetUserId === user.id ||
      !isReportReason(body.reason) ||
      (body.messageId != null && !isUuid(body.messageId)) ||
      (body.details != null && typeof body.details !== "string")) {
    return jsonNoStore({ error: "신고 정보가 올바르지 않아요." }, 400);
  }
  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (details.length > 500) return jsonNoStore({ error: "신고 상세 내용은 500자 이하로 입력해주세요." }, 400);
  const { error } = await supabase.rpc("report_user", {
    target_user_id: body.targetUserId,
    target_conversation_id: body.conversationId,
    target_message_id: body.messageId ?? null,
    report_reason: body.reason,
    report_details: details || null,
  });
  return error ? rpcError(error.message) : jsonNoStore({ message: "신고가 접수되었어요." });
}

const handlers: Record<ChatAction, (context: HandlerContext) => Promise<Response>> = {
  create: handleCreateChat,
  "create-group": handleCreateGroup,
  history: handleHistory,
  send: handleSendMessage,
  "photo-status": handlePhoto,
  "photo-consent": handlePhoto,
  setting: handleSetting,
  block: handleBlock,
  report: handleReport,
};

export function isChatAction(value: unknown): value is ChatAction {
  return typeof value === "string" && value in handlers;
}

export async function handleChatAction(context: HandlerContext) {
  if (!isChatAction(context.body.action)) {
    return jsonNoStore({ error: "지원하지 않는 요청이에요." }, 400);
  }
  return handlers[context.body.action](context);
}
