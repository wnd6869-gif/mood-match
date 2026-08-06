import type { User } from "@supabase/supabase-js";
import { jsonNoStore } from "@/lib/api/json";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createClient>>
>;

type RequireUserOptions = {
  errorMessage?: string;
};

type RequireUserSuccess = {
  ok: true;
  user: User;
};

type RequireUserFailure = {
  ok: false;
  response: Response;
};

export type RequireUserResult =
  | RequireUserSuccess
  | RequireUserFailure;

export async function requireUser(
  supabase: ServerSupabaseClient,
  options: RequireUserOptions = {},
): Promise<RequireUserResult> {
  const {
    errorMessage = "로그인 후 다시 시도해주세요.",
  } = options;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: jsonNoStore({ error: errorMessage }, 401),
    };
  }

  return {
    ok: true,
    user,
  };
}
