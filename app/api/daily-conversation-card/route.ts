import { jsonNoStore } from "@/lib/api/json";
import { requireRouteUser } from "@/lib/api/route-guard";
import { DAILY_CONVERSATION_TOPICS } from "@/lib/daily-conversation-card";

type Body = {
  action?: unknown;
  question?: unknown;
  topic?: unknown;
  customTopic?: unknown;
};

function isTopic(value: unknown) {
  return DAILY_CONVERSATION_TOPICS.includes(value as never);
}

export async function POST(request: Request) {
  const guard = await requireRouteUser(request, {
    unauthorizedMessage: "로그인 후 오늘의 대화 카드를 작성할 수 있어요.",
  });
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || !["keep_previous", "skip", "save"].includes(String(body.action))) {
    return jsonNoStore({ error: "요청을 다시 확인해주세요." }, 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const customTopic = typeof body.customTopic === "string" ? body.customTopic.trim() : "";
  if (question.length > 160 || customTopic.length > 60) {
    return jsonNoStore({ error: "오늘의 대화 카드는 질문 160자, 소재 60자까지 작성할 수 있어요." }, 400);
  }
  if (body.action === "save" && body.topic !== null && body.topic !== undefined && !isTopic(body.topic)) {
    return jsonNoStore({ error: "오늘의 소재를 다시 골라주세요." }, 400);
  }
  if (body.action === "save" && body.topic === "custom" && !customTopic) {
    return jsonNoStore({ error: "직접 작성할 소재를 입력해주세요." }, 400);
  }
  if (body.action === "save" && !question && !body.topic) {
    return jsonNoStore(
      { error: "질문 또는 오늘의 소재 중 하나를 골라주세요." },
      400,
    );
  }

  const { data, error } = await guard.supabase.rpc("save_my_daily_conversation_card", {
    p_action: body.action,
    p_question: question || null,
    p_topic: body.action === "save" && isTopic(body.topic) ? body.topic : null,
    p_custom_topic: body.action === "save" && body.topic === "custom" ? customTopic : null,
  });
  if (error) {
    return jsonNoStore({ error: "오늘의 대화 카드를 저장하지 못했어요. 잠시 후 다시 시도해주세요." }, 500);
  }
  return jsonNoStore({ card: data });
}
