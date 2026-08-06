import type { User } from "@supabase/supabase-js";
import { jsonNoStore } from "@/lib/api/json";
import { requireUser } from "@/lib/api/require-user";
import { verifySameOriginRequest } from "@/lib/api/verify-origin";
import { createClient } from "@/lib/supabase/server";
import { getModerationStateFromRecord } from "@/lib/moderation";

type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createClient>>
>;

type GuardOptions = {
  allowMissingOrigin?: boolean;
  originErrorMessage?: string;
  unauthorizedMessage?: string;
  serviceUnavailableMessage?: string;
  requireActiveModeration?: boolean;
  restrictedMessage?: string;
};

type GuardFailure = {
  ok: false;
  response: Response;
};

type GuardSuccess = {
  ok: true;
  supabase: ServerSupabaseClient;
  user: User;
};

export type RouteGuardResult = GuardFailure | GuardSuccess;

export async function requireRouteUser(
  request: Request,
  options: GuardOptions = {},
): Promise<RouteGuardResult> {
  const originCheck = verifySameOriginRequest(request, {
    errorMessage: options.originErrorMessage,
    allowMissingOrigin: options.allowMissingOrigin,
  });

  if (!originCheck.ok) {
    return originCheck;
  }

  const supabase = await createClient();

  if (!supabase) {
    return {
      ok: false,
      response: jsonNoStore(
        {
          error:
            options.serviceUnavailableMessage ??
            "서버 설정을 확인해주세요.",
        },
        503,
      ),
    };
  }

  const userCheck = await requireUser(supabase, {
    errorMessage: options.unauthorizedMessage,
  });

  if (!userCheck.ok) {
    return userCheck;
  }

  if (options.requireActiveModeration !== false) {
    const { data, error } = await supabase.rpc("get_my_moderation_status");
    if (error) {
      return {
        ok: false,
        response: jsonNoStore({ error: "계정 상태를 확인하지 못했어요." }, 503),
      };
    }
    const moderation = getModerationStateFromRecord(
      Array.isArray(data) ? data[0] : data,
    );
    if (moderation.status !== "active") {
      return {
        ok: false,
        response: jsonNoStore(
          { error: options.restrictedMessage ?? "현재 계정 상태에서는 이 기능을 이용할 수 없어요." },
          403,
        ),
      };
    }
  }

  return {
    ok: true,
    supabase,
    user: userCheck.user,
  };
}
