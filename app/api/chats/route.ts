import { requireRouteUser } from "@/lib/api/route-guard";
import {
  handleChatAction,
  type ChatRequestBody,
} from "@/lib/api/chats/handlers";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await requireRouteUser(request, {
    unauthorizedMessage: "로그인 후 채팅을 이용해주세요.",
  });
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as
    | ChatRequestBody
    | null;

  if (!body || typeof body.action !== "string") {
    return Response.json(
      { error: "요청 형식이 올바르지 않아요." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const response = await handleChatAction({
    supabase: guard.supabase,
    user: guard.user,
    body,
  });
  if (response.status >= 500) {
    logger.error("chat_action_failed", {
      route: "/api/chats",
      action: body.action,
      userId: guard.user.id,
      code: `http_${response.status}`,
    });
  }
  return response;
}
