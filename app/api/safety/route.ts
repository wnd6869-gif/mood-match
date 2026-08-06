import { isReportReason } from "@/lib/safety";
import { requireRouteUser } from "@/lib/api/route-guard";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";

type SafetyRequestBody = {
  action?: unknown;
  targetUserId?: unknown;
  reason?: unknown;
  details?: unknown;
  conversationId?: unknown;
  messageId?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  if (status >= 500) {
    logger.error("safety_action_failed", {
      route: "/api/safety",
      code: `http_${status}`,
    });
  }
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function rpcErrorResponse(message: string | undefined) {
  if (message === "authentication_required") {
    return jsonResponse({ error: "로그인이 필요해요." }, 401);
  }

  if (message === "report_details_too_long") {
    return jsonResponse(
      { error: "추가 설명은 500자 이하로 입력해주세요." },
      400,
    );
  }

  if (
    message === "invalid_block_target" ||
    message === "invalid_report_target" ||
    message === "invalid_report_reason" ||
    message === "invalid_report_context" ||
    message === "invalid_report_message" ||
    message === "conversation_required_for_message"
  ) {
    return jsonResponse(
      { error: "신고 또는 차단 정보를 확인할 수 없어요." },
      400,
    );
  }

  return jsonResponse(
    { error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요." },
    500,
  );
}

export async function POST(request: Request) {
  const routeGuard = await requireRouteUser(request, {
    unauthorizedMessage: "로그인이 필요해요.",
  });
  if (!routeGuard.ok) return routeGuard.response;
  const { supabase, user } = routeGuard;
  const body = (await request.json().catch(() => null)) as
    | SafetyRequestBody
    | null;

  if (!body || typeof body.action !== "string") {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요." }, 400);
  }

  if (!isUuid(body.targetUserId) || body.targetUserId === user.id) {
    return jsonResponse(
      { error: "신고 또는 차단할 사용자 정보가 올바르지 않아요." },
      400,
    );
  }

  if (body.action === "block" || body.action === "unblock") {
    const { error } = await supabase.rpc(
      body.action === "block" ? "block_user" : "unblock_user",
      { target_user_id: body.targetUserId },
    );

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({
      message:
        body.action === "block"
          ? "사용자를 차단했어요."
          : "차단을 해제했어요.",
    });
  }

  if (body.action === "report") {
    if (
      !isReportReason(body.reason) ||
      (body.details !== undefined &&
        body.details !== null &&
        typeof body.details !== "string") ||
      (body.conversationId !== undefined &&
        body.conversationId !== null &&
        !isUuid(body.conversationId)) ||
      (body.messageId !== undefined &&
        body.messageId !== null &&
        !isUuid(body.messageId))
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
        { error: "추가 설명은 500자 이하로 입력해주세요." },
        400,
      );
    }

    const { data, error } = await supabase.rpc("report_user", {
      target_user_id: body.targetUserId,
      report_reason: body.reason,
      report_details: details || null,
      target_conversation_id: body.conversationId ?? null,
      target_message_id: body.messageId ?? null,
    });

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({
      reportId: data,
      message:
        "신고가 접수되었어요. 검토 후 필요한 조치를 진행할게요.",
    });
  }

  return jsonResponse({ error: "지원하지 않는 요청이에요." }, 400);
}
