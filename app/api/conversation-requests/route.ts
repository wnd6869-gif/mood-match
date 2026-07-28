import { createClient } from "@/lib/supabase/server";

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
      { error: "자기 자신에게는 대화를 신청할 수 없어요." },
      400,
    );
  }

  if (message === "already_pending") {
    return jsonResponse(
      {
        error: "이미 대화를 신청했어요. 보낸 요청에서 상태를 확인해주세요.",
        code: "already_pending",
      },
      409,
    );
  }

  if (message === "reverse_pending") {
    return jsonResponse(
      {
        error: "상대가 이미 대화를 신청했어요.",
        code: "reverse_pending",
      },
      409,
    );
  }

  if (message === "already_connected") {
    return jsonResponse(
      { error: "이미 대화가 연결된 사용자예요.", code: "accepted" },
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
            : "현재 대화를 신청할 수 없는 프로필이에요.",
      },
      403,
    );
  }

  if (message === "message_too_long") {
    return jsonResponse(
      { error: "신청 메시지는 120자 이하로 입력해주세요." },
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
      { error: "로그인 후 대화 요청을 이용해주세요." },
      401,
    );
  }

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
        { error: "자기 자신에게는 대화를 신청할 수 없어요." },
        400,
      );
    }

    if (
      body.message !== undefined &&
      body.message !== null &&
      typeof body.message !== "string"
    ) {
      return jsonResponse(
        { error: "신청 메시지 형식이 올바르지 않아요." },
        400,
      );
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (message.length > 120) {
      return jsonResponse(
        { error: "신청 메시지는 120자 이하로 입력해주세요." },
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
      message: "대화 신청을 보냈어요.",
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
          ? "대화 신청을 수락했어요."
          : "대화 신청을 거절했어요.",
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

    return jsonResponse({ message: "대화 신청을 취소했어요." });
  }

  return jsonResponse({ error: "지원하지 않는 요청이에요." }, 400);
}
