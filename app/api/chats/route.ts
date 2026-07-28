import {
  getChatMessageFromRecord,
} from "@/lib/chat";
import { isReportReason } from "@/lib/safety";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChatRequestBody = {
  action?: unknown;
  requestId?: unknown;
  conversationId?: unknown;
  message?: unknown;
  setting?: unknown;
  targetUserId?: unknown;
  reason?: unknown;
  details?: unknown;
  messageId?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SETTING_ACTIONS = [
  "read",
  "mute",
  "unmute",
  "hide",
  "unhide",
  "leave",
] as const;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function rpcErrorResponse(message: string | undefined) {
  if (
    message === "accepted_request_required" ||
    message === "active_membership_required"
  ) {
    return jsonResponse(
      { error: "이 채팅을 이용할 권한이 없어요." },
      403,
    );
  }

  if (message === "user_blocked" || message === "user_unavailable") {
    return jsonResponse(
      { error: "현재 이 사용자와 메시지를 주고받을 수 없어요." },
      403,
    );
  }

  if (message === "other_member_left") {
    return jsonResponse(
      { error: "상대가 채팅방을 나가 메시지를 보낼 수 없어요." },
      409,
    );
  }

  if (message === "empty_message") {
    return jsonResponse(
      { error: "메시지 내용을 입력해주세요." },
      400,
    );
  }

  if (message === "message_too_long") {
    return jsonResponse(
      { error: "메시지는 1000자 이하로 입력해주세요." },
      400,
    );
  }

  if (
    message === "invalid_setting_action" ||
    message === "invalid_block_target" ||
    message === "invalid_report_target" ||
    message === "invalid_report_reason"
  ) {
    return jsonResponse(
      { error: "요청 형식이 올바르지 않아요." },
      400,
    );
  }

  if (message === "report_details_too_long") {
    return jsonResponse(
      { error: "신고 상세 내용은 500자 이하로 입력해주세요." },
      400,
    );
  }

  return jsonResponse(
    { error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요." },
    500,
  );
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return jsonResponse({ error: "허용되지 않은 요청이에요." }, 403);
  }

  const supabase = await createClient();

  if (!supabase) {
    return jsonResponse(
      { error: "서버의 Supabase 설정을 확인해주세요." },
      503,
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      { error: "로그인 후 채팅을 이용해주세요." },
      401,
    );
  }

  const body = (await request.json().catch(() => null)) as
    | ChatRequestBody
    | null;

  if (!body || typeof body.action !== "string") {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요." }, 400);
  }

  if (body.action === "create") {
    if (!isUuid(body.requestId)) {
      return jsonResponse(
        { error: "대화 요청 정보가 올바르지 않아요." },
        400,
      );
    }

    const { data, error } = await supabase.rpc(
      "create_direct_conversation_from_request",
      { request_id: body.requestId },
    );

    if (error) {
      return rpcErrorResponse(error.message);
    }

    if (typeof data !== "string") {
      return jsonResponse(
        { error: "생성된 채팅방을 확인하지 못했어요." },
        500,
      );
    }

    const { error: unhideError } = await supabase.rpc(
      "update_my_conversation_settings",
      {
      target_conversation_id: data,
      setting_action: "unhide",
      },
    );

    if (unhideError) {
      return rpcErrorResponse(unhideError.message);
    }

    return jsonResponse({ conversationId: data });
  }

  if (!isUuid(body.conversationId)) {
    return jsonResponse(
      { error: "채팅방 정보가 올바르지 않아요." },
      400,
    );
  }

  if (body.action === "send") {
    if (typeof body.message !== "string") {
      return jsonResponse(
        { error: "메시지 형식이 올바르지 않아요." },
        400,
      );
    }

    const message = body.message.trim();

    if (!message) {
      return jsonResponse(
        { error: "메시지 내용을 입력해주세요." },
        400,
      );
    }

    if (message.length > 1000) {
      return jsonResponse(
        { error: "메시지는 1000자 이하로 입력해주세요." },
        400,
      );
    }

    const { data, error } = await supabase.rpc("send_message", {
      target_conversation_id: body.conversationId,
      message_body: message,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    const messageRecord = getChatMessageFromRecord(
      Array.isArray(data) ? data[0] : data,
    );

    if (!messageRecord) {
      return jsonResponse(
        { error: "전송된 메시지를 확인하지 못했어요." },
        500,
      );
    }

    return jsonResponse({ message: messageRecord });
  }

  if (body.action === "setting") {
    if (
      typeof body.setting !== "string" ||
      !SETTING_ACTIONS.includes(
        body.setting as (typeof SETTING_ACTIONS)[number],
      )
    ) {
      return jsonResponse(
        { error: "채팅 설정 형식이 올바르지 않아요." },
        400,
      );
    }

    const { error } = await supabase.rpc(
      "update_my_conversation_settings",
      {
        target_conversation_id: body.conversationId,
        setting_action: body.setting,
      },
    );

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({ message: "채팅 설정을 변경했어요." });
  }

  if (body.action === "block") {
    if (!isUuid(body.targetUserId) || body.targetUserId === user.id) {
      return jsonResponse(
        { error: "차단할 사용자 정보가 올바르지 않아요." },
        400,
      );
    }

    const { error } = await supabase.rpc("block_chat_user", {
      target_user_id: body.targetUserId,
      target_conversation_id: body.conversationId,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({
      message: "사용자를 차단하고 채팅을 숨겼어요.",
    });
  }

  if (body.action === "report") {
    if (
      !isUuid(body.targetUserId) ||
      body.targetUserId === user.id ||
      typeof body.reason !== "string" ||
      !isReportReason(body.reason) ||
      (body.details !== undefined &&
        body.details !== null &&
        typeof body.details !== "string")
    ) {
      return jsonResponse(
        { error: "신고 정보가 올바르지 않아요." },
        400,
      );
    }

    const details =
      typeof body.details === "string" ? body.details.trim() : "";

    if (details.length > 500) {
      return jsonResponse(
        { error: "신고 상세 내용은 500자 이하로 입력해주세요." },
        400,
      );
    }

    if (
      body.messageId !== undefined &&
      body.messageId !== null &&
      !isUuid(body.messageId)
    ) {
      return jsonResponse(
        { error: "신고할 메시지 정보가 올바르지 않아요." },
        400,
      );
    }

    const { error } = await supabase.rpc("report_user", {
      target_user_id: body.targetUserId,
      target_conversation_id: body.conversationId,
      target_message_id: body.messageId ?? null,
      report_reason: body.reason,
      report_details: details || null,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({
      message:
        "신고가 접수되었어요. 검토 후 필요한 조치를 진행할게요.",
    });
  }

  return jsonResponse({ error: "지원하지 않는 요청이에요." }, 400);
}
