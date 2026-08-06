import {
  getAdminSession,
  isModerationStatus,
} from "@/lib/admin";
import { verifySameOriginRequest } from "@/lib/api/verify-origin";
import { logger } from "@/lib/server/logger";

export const runtime = "nodejs";

type AdminRequestBody = {
  action?: unknown;
  targetUserId?: unknown;
  targetReportId?: unknown;
  status?: unknown;
  reason?: unknown;
  suspendedUntil?: unknown;
  adminNote?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REPORT_STATUSES = [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
] as const;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  if (status >= 500) {
    logger.error("admin_action_failed", {
      route: "/api/admin",
      code: `http_${status}`,
    });
  }
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function rpcErrorResponse(message: string | undefined) {
  if (
    message === "admin_required" ||
    message === "admin_hierarchy_violation" ||
    message === "self_admin_action"
  ) {
    return jsonResponse(
      { error: "이 작업을 수행할 관리자 권한이 없어요." },
      403,
    );
  }

  if (
    message === "invalid_status" ||
    message === "invalid_report_status" ||
    message === "moderation_reason_required" ||
    message === "invalid_suspension" ||
    message === "admin_note_too_long"
  ) {
    return jsonResponse(
      { error: "입력한 조치 내용을 다시 확인해주세요." },
      400,
    );
  }

  if (message === "report_not_found" || message === "user_not_found") {
    return jsonResponse({ error: "대상을 찾을 수 없어요." }, 404);
  }

  return jsonResponse(
    { error: "관리자 작업을 처리하지 못했어요." },
    500,
  );
}

export async function POST(request: Request) {
  const originCheck = verifySameOriginRequest(request);
  if (!originCheck.ok) return originCheck.response;
  const admin = await getAdminSession();

  if (!admin) {
    return jsonResponse({ error: "페이지를 찾을 수 없어요." }, 404);
  }

  const body = (await request.json().catch(() => null)) as
    | AdminRequestBody
    | null;

  if (!body || typeof body.action !== "string") {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요." }, 400);
  }

  if (body.action === "updateUserStatus") {
    if (
      !isUuid(body.targetUserId) ||
      !isModerationStatus(body.status) ||
      (body.reason !== undefined &&
        body.reason !== null &&
        typeof body.reason !== "string") ||
      (body.suspendedUntil !== undefined &&
        body.suspendedUntil !== null &&
        typeof body.suspendedUntil !== "string")
    ) {
      return jsonResponse(
        { error: "사용자 조치 정보가 올바르지 않아요." },
        400,
      );
    }

    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason || reason.length > 500) {
      return jsonResponse(
        { error: "조치 사유를 500자 이하로 입력해주세요." },
        400,
      );
    }

    let suspendedUntil: string | null = null;

    if (body.status === "suspended") {
      const date = new Date(asString(body.suspendedUntil));

      if (
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now()
      ) {
        return jsonResponse(
          { error: "정지 종료 시간을 확인해주세요." },
          400,
        );
      }

      suspendedUntil = date.toISOString();
    }

    const { error } = await admin.supabase.rpc(
      "admin_update_user_status",
      {
        target_user_id: body.targetUserId,
        new_status: body.status,
        reason: reason || null,
        suspended_until: suspendedUntil,
      },
    );

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({ message: "사용자 상태를 변경했어요." });
  }

  if (body.action === "disablePublicProfile") {
    if (
      !isUuid(body.targetUserId) ||
      typeof body.reason !== "string" ||
      !body.reason.trim() ||
      body.reason.trim().length > 500
    ) {
      return jsonResponse(
        { error: "사용자 정보가 올바르지 않아요." },
        400,
      );
    }

    const { error } = await admin.supabase.rpc(
      "admin_disable_public_profile",
      {
        target_user_id: body.targetUserId,
        reason: body.reason.trim(),
      },
    );

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({ message: "공개 프로필을 비활성화했어요." });
  }

  if (body.action === "updateReportStatus") {
    if (
      !isUuid(body.targetReportId) ||
      typeof body.status !== "string" ||
      !REPORT_STATUSES.includes(
        body.status as (typeof REPORT_STATUSES)[number],
      ) ||
      (body.adminNote !== undefined &&
        body.adminNote !== null &&
        typeof body.adminNote !== "string")
    ) {
      return jsonResponse(
        { error: "신고 처리 정보가 올바르지 않아요." },
        400,
      );
    }

    const adminNote =
      typeof body.adminNote === "string" ? body.adminNote.trim() : "";

    if (!adminNote || adminNote.length > 1000) {
      return jsonResponse(
        { error: "관리자 메모를 1000자 이하로 입력해주세요." },
        400,
      );
    }

    const { error } = await admin.supabase.rpc(
      "admin_update_report_status",
      {
        target_report_id: body.targetReportId,
        new_status: body.status,
        admin_note: adminNote || null,
      },
    );

    if (error) {
      return rpcErrorResponse(error.message);
    }

    return jsonResponse({ message: "신고 처리 상태를 변경했어요." });
  }

  return jsonResponse({ error: "지원하지 않는 요청이에요." }, 400);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}
