import { jsonNoStore } from "@/lib/api/json";

type VerifyOriginOptions = {
  errorMessage?: string;
  allowMissingOrigin?: boolean;
};

type VerifyOriginSuccess = {
  ok: true;
  source: "origin" | "referer" | "missing";
};

type VerifyOriginFailure = {
  ok: false;
  response: Response;
};

export type VerifyOriginResult =
  | VerifyOriginSuccess
  | VerifyOriginFailure;

function getHeaderOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function verifySameOriginRequest(
  request: Request,
  options: VerifyOriginOptions = {},
): VerifyOriginResult {
  const {
    errorMessage = "허용되지 않은 요청이에요.",
    allowMissingOrigin = true,
  } = options;
  const requestOrigin = new URL(request.url).origin;
  const originHeader = getHeaderOrigin(request.headers.get("origin"));
  const refererHeader = getHeaderOrigin(request.headers.get("referer"));

  if (originHeader) {
    return originHeader === requestOrigin
      ? { ok: true, source: "origin" }
      : {
          ok: false,
          response: jsonNoStore({ error: errorMessage }, 403),
        };
  }

  if (refererHeader) {
    return refererHeader === requestOrigin
      ? { ok: true, source: "referer" }
      : {
          ok: false,
          response: jsonNoStore({ error: errorMessage }, 403),
        };
  }

  if (allowMissingOrigin) {
    return { ok: true, source: "missing" };
  }

  return {
    ok: false,
    response: jsonNoStore({ error: errorMessage }, 403),
  };
}
