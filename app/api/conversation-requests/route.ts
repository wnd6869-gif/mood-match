import { requireRouteUser } from "@/lib/api/route-guard";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";

type RequestBody = {
  action?: unknown;
  targetUserId?: unknown;
  message?: unknown;
  requestId?: unknown;
  response?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  if (status >= 500) {
    logger.error("conversation_request_failed", {
      route: "/api/conversation-requests",
      code: `http_${status}`,
    });
  }
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getRpcErrorResponse(message: string | undefined) {
  if (message === "self_request") {
    return jsonResponse(
      { error: "자기 자신에게는 대화를 걸 수 없어요." },
      400,
    );
  }

  if (message === "already_pending") {
    return jsonResponse(
      {
        error: "이미 인사를 보냈어요. 보낸 인사에서 상태를 확인해주세요.",
        code: "already_pending",
      },
      409,
    );
  }

  if (message === "reverse_pending") {
    return jsonResponse(
      {
        error: "상대가 먼저 인사를 보냈어요.",
        code: "reverse_pending",
      },
      409,
    );
  }

  if (message === "already_connected") {
    return jsonResponse(
      { error: "이미 대화가 열려 있는 사용자예요.", code: "accepted" },
      409,
    );
  }

  if (message === "user_blocked") {
    return jsonResponse(
      { error: "현재 이 사용자와 대화를 시작할 수 없어요." },
      403,
    );
  }

  if (
    message === "target_unavailable" ||
    message === "target_not_one_to_one" ||
    message === "user_unavailable"
  ) {
    return jsonResponse(
      {
        error:
          message === "target_not_one_to_one"
            ? "상대가 현재 1:1 대화를 받지 않아요."
            : "현재 대화를 걸 수 없는 프로필이에요.",
      },
      403,
    );
  }

  if (message === "message_too_long") {
    return jsonResponse(
      { error: "첫 인사는 120자 이하로 입력해주세요." },
      400,
    );
  }

  if (
    message === "request_not_actionable" ||
    message === "invalid_response"
  ) {
    return jsonResponse(
      { error: "이미 처리되었거나 처리할 수 없는 요청이에요." },
      409,
    );
  }

  return jsonResponse(
    { error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요." },
    500,
  );
}

export async function POST(request: Request) {
  const routeGuard = await requireRouteUser(request, {
    unauthorizedMessage: "로그인 후 대화 요청을 이용해주세요.",
  });
  if (!routeGuard.ok) return routeGuard.response;
  const { supabase, user } = routeGuard;
  const body = (await request.json().catch(() => null)) as
    | RequestBody
    | null;

  if (!body || typeof body.action !== "string") {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요." }, 400);
  }

  if (body.action === "send") {
    if (
      typeof body.targetUserId !== "string" ||
      !UUID_PATTERN.test(body.targetUserId)
    ) {
      return jsonResponse(
        { error: "대화 상대 정보가 올바르지 않아요." },
        400,
      );
    }

    if (body.targetUserId === user.id) {
      return jsonResponse(
        { error: "자기 자신에게는 대화를 걸 수 없어요." },
        400,
      );
    }

    if (
      body.message !== undefined &&
      body.message !== null &&
      typeof body.message !== "string"
    ) {
      return jsonResponse(
        { error: "첫 인사 형식이 올바르지 않아요." },
        400,
      );
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (message.length > 120) {
      return jsonResponse(
        { error: "첫 인사는 120자 이하로 입력해주세요." },
        400,
      );
    }

    const { data, error } = await supabase.rpc(
      "send_conversation_request",
      {
        target_user_id: body.targetUserId,
        intro_message: message || null,
      },
    );

    if (error) {
      return getRpcErrorResponse(error.message);
    }

    return jsonResponse({
      message: "가볍게 인사를 보냈어요.",
      requestId: data,
    });
  }

  if (
    typeof body.requestId !== "string" ||
    !UUID_PATTERN.test(body.requestId)
  ) {
    return jsonResponse(
      { error: "대화 요청 정보가 올바르지 않아요." },
      400,
    );
  }

  if (body.action === "respond") {
    if (
      body.response !== "accepted" &&
      body.response !== "declined"
    ) {
      return jsonResponse(
        { error: "응답 형식이 올바르지 않아요." },
        400,
      );
    }

    const { error } = await supabase.rpc(
      "respond_to_conversation_request",
      {
        request_id: body.requestId,
        response: body.response,
      },
    );

    if (error) {
      return getRpcErrorResponse(error.message);
    }

    return jsonResponse({
      message:
        body.response === "accepted"
          ? "대화가 열렸어요."
          : "이번 인사는 넘겼어요.",
    });
  }

  if (body.action === "cancel") {
    const { error } = await supabase.rpc(
      "cancel_conversation_request",
      { request_id: body.requestId },
    );

    if (error) {
      return getRpcErrorResponse(error.message);
    }

    return jsonResponse({ message: "보낸 인사를 취소했어요." });
  }

  return jsonResponse({ error: "지원하지 않는 요청이에요." }, 400);
}
