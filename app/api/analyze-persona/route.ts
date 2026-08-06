import { createHash } from "node:crypto";
import OpenAI from "openai";
import { requireRouteUser } from "@/lib/api/route-guard";
import {
  createPersonaCastingSeed,
  getStoredPersona,
  parseAnalysisClaim,
} from "@/lib/ai/persona-cache";
import { requestPersonaAnalysis } from "@/lib/ai/persona-service";
import {
  detectProfilePhotoMimeType,
  downloadStoredProfilePhoto,
  persistPersonaAnalysis,
  PROFILE_PHOTO_MAX_SIZE_BYTES,
} from "@/lib/ai/persona-storage";
import { logger } from "@/lib/server/logger";
import { getPersonaResultFromRecord } from "@/lib/persona-record";
import {
  getPhotoEligibilityErrorMessage,
  isPhotoEligible,
} from "@/lib/photo-eligibility";
import { castCharacter, recipeToComposition } from "@/lib/character-casting";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function safeErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { name: "UnknownError" };
  }

  const candidate = error as Record<string, unknown>;

  return {
    name:
      error instanceof Error
        ? error.name
        : typeof candidate.name === "string"
          ? candidate.name
          : "UnknownError",
    message:
      error instanceof Error
        ? error.message
        : typeof candidate.message === "string"
          ? candidate.message
          : undefined,
    status:
      typeof candidate.status === "number" ? candidate.status : undefined,
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    type: typeof candidate.type === "string" ? candidate.type : undefined,
    requestId:
      typeof candidate.request_id === "string"
        ? candidate.request_id
        : undefined,
  };
}

function parseRerollRequest(value: unknown) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    ((value as Record<string, unknown>).reroll === true ||
      // Backward-compatible with deployed clients. New clients use `reroll`.
      (value as Record<string, unknown>).force === true)
  );
}

function logAnalysisSource(
  source: "database-cache" | "openai",
  record: {
    modelName: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  },
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[persona-analysis] 분석 결과", {
    source,
    modelName: record.modelName,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    totalTokens: record.totalTokens,
  });
}

export async function POST(request: Request) {
  const routeGuard = await requireRouteUser(request, {
    unauthorizedMessage: "로그인 후 사진 분석을 이용해주세요.",
  });
  if (!routeGuard.ok) return routeGuard.response;
  const { supabase, user } = routeGuard;
  const requestBody = await request.json().catch(() => null);
  const reroll = parseRerollRequest(requestBody);
  const {
    record: existingRecord,
    error: existingRecordError,
  } = await getStoredPersona(supabase, user.id);

  if (existingRecordError) {
    logger.error("analyze_persona_cache_read_failed", {
      route: "/api/analyze-persona",
      userId: user.id,
      code: existingRecordError.code ?? "unknown",
    });
    if (process.env.NODE_ENV === "development") {
      console.error("[persona-analysis] DB 캐시 조회 실패", {
        code: existingRecordError.code,
        message: existingRecordError.message,
      });
    }

    return jsonResponse(
      {
        error:
          "저장된 AI 캐릭터를 확인하지 못했어요. personas SQL 실행 여부를 확인해주세요.",
      },
      503,
    );
  }

  if (existingRecord && !reroll) {
    const cachedResult = getPersonaResultFromRecord(existingRecord);

    if (!cachedResult) {
      return jsonResponse(
        { error: "저장된 분석 결과 형식이 올바르지 않아요." },
        500,
      );
    }

    logAnalysisSource("database-cache", {
      modelName: existingRecord.model_name,
      inputTokens: existingRecord.input_tokens,
      outputTokens: existingRecord.output_tokens,
      totalTokens: existingRecord.total_tokens,
    });

    return jsonResponse({
      result: cachedResult,
      source: "cache",
    });
  }

  let claimLogId: string | null = null;
  let analysisSucceeded = false;

  try {
    const { data: claimData, error: claimError } = await supabase.rpc(
      "claim_persona_analysis",
      { p_force: reroll },
    );
    const claim = parseAnalysisClaim(claimData);

    if (claimError || !claim) {
      logger.error("analyze_persona_claim_failed", {
        route: "/api/analyze-persona",
        userId: user.id,
        code: claimError?.code ?? "invalid_claim",
      });
      if (process.env.NODE_ENV === "development") {
        console.error("[persona-analysis] 분석 요청 예약 실패", {
          code: claimError?.code,
          message: claimError?.message,
        });
      }

      return jsonResponse(
        {
          error:
            "분석 요청을 확인하지 못했어요. personas SQL 실행 여부를 확인해주세요.",
        },
        503,
      );
    }

    if (claim.status === "rate_limited") {
      return jsonResponse(
        {
          error:
            "오늘 가능한 캐릭터 다시 만들기 2회를 모두 사용했어요. 내일 다시 시도해주세요.",
        },
        429,
      );
    }

    if (claim.status === "in_progress") {
      return jsonResponse(
        { error: "이미 분석을 진행하고 있어요. 잠시 후 다시 확인해주세요." },
        429,
      );
    }

    if (claim.status === "cached") {
      const { record } = await getStoredPersona(supabase, user.id);
      const cachedResult = getPersonaResultFromRecord(record);

      if (!record || !cachedResult) {
        return jsonResponse(
          { error: "저장된 분석 결과를 불러오지 못했어요." },
          500,
        );
      }

      logAnalysisSource("database-cache", {
        modelName: record.model_name,
        inputTokens: record.input_tokens,
        outputTokens: record.output_tokens,
        totalTokens: record.total_tokens,
      });

      return jsonResponse({
        result: cachedResult,
        source: "cache",
      });
    }

    if (!claim.log_id) {
      return jsonResponse(
        { error: "분석 요청 기록을 만들지 못했어요." },
        500,
      );
    }

    claimLogId = claim.log_id;
    const storedPhoto = await downloadStoredProfilePhoto(
      supabase,
      user.id,
    );

    if (!storedPhoto) {
      if (process.env.NODE_ENV === "development") {
        console.error("[persona-analysis] Storage 사진을 찾지 못함");
      }

      return jsonResponse(
        { error: "분석할 프로필 사진을 찾지 못했어요. 사진을 다시 올려주세요." },
        404,
      );
    }

    const { imageBlob, objectPath } = storedPhoto;

    if (
      imageBlob.size === 0 ||
      imageBlob.size > PROFILE_PHOTO_MAX_SIZE_BYTES
    ) {
      return jsonResponse(
        { error: "사진 크기가 올바르지 않아요. 사진을 다시 올려주세요." },
        400,
      );
    }

    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
    const imageContentType = detectProfilePhotoMimeType(imageBuffer);

    if (!imageContentType) {
      return jsonResponse(
        {
          error:
            "JPEG, PNG 또는 WebP 형식의 프로필 사진이 필요해요. 사진을 다시 올려주세요.",
        },
        400,
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return jsonResponse(
        { error: "서버의 OpenAI API 설정이 아직 준비되지 않았어요." },
        503,
      );
    }

    const openai = new OpenAI({ apiKey });
    const safetyIdentifier = createHash("sha256")
      .update(user.id)
      .digest("hex");
    const analysis = await requestPersonaAnalysis(
      openai,
      `data:${imageContentType};base64,${imageBuffer.toString("base64")}`,
      safetyIdentifier,
    );

    if (!isPhotoEligible(analysis.photoEligibility)) {
      const { error: cancellationError } = await supabase.rpc(
        "cancel_persona_analysis",
        { p_log_id: claimLogId },
      );

      if (!cancellationError) {
        claimLogId = null;
      } else if (process.env.NODE_ENV === "development") {
        console.error("[persona-analysis] 부적합 사진 분석 예약 취소 실패", {
          code: cancellationError.code,
          message: cancellationError.message,
        });
      }

      if (cancellationError) {
        logger.error("analyze_persona_claim_cancel_failed", {
          route: "/api/analyze-persona",
          userId: user.id,
          requestId: claimLogId,
          code: cancellationError.code ?? "unknown",
        });
      }

      return jsonResponse(
        {
          code: "photo_requirements_not_met",
          error: getPhotoEligibilityErrorMessage(
            analysis.photoEligibility,
          ),
        },
        422,
      );
    }

    const personaFields = {
        user_id: user.id,
        photo_path: objectPath,
        animal_types: analysis.result.animalTypes,
        mood_keywords: analysis.result.moodKeywords,
        persona_title: analysis.result.personaTitle,
        persona_description: analysis.result.personaDescription,
        nickname_candidates: analysis.result.nicknameCandidates,
        visual_traits: analysis.result.visualTraits,
        model_name: analysis.modelName,
        input_tokens: analysis.inputTokens,
        output_tokens: analysis.outputTokens,
        total_tokens: analysis.totalTokens,
        analysis_source: "openai",
      };
    const castingSeed = createPersonaCastingSeed(
      user.id,
      objectPath,
      reroll ? claimLogId : null,
    );
    const primaryAnimalName = [...analysis.result.animalTypes]
      .sort((left, right) => right.score - left.score)[0]?.name;
    const recipe = castCharacter(
      analysis.castingSignals,
      castingSeed,
      primaryAnimalName,
    );
    // Keep the legacy composition column populated for older readers, but make
    // it a lossless adapter of the persisted avatar-v1 recipe.
    const composition = recipeToComposition(recipe);
    const saveError = await persistPersonaAnalysis(
      supabase,
      personaFields,
      recipe,
      composition,
    );

    if (saveError) {
      const saveErrorDetails = safeErrorDetails(saveError);
      const saveErrorRecord = saveError as unknown as Record<string, unknown>;
      logger.error("analyze_persona_persist_failed", {
        route: "/api/analyze-persona",
        userId: user.id,
        requestId: claimLogId,
        code: saveErrorDetails.code ?? "unknown",
        constraint:
          typeof saveErrorRecord.constraint === "string"
            ? saveErrorRecord.constraint
            : undefined,
      });
      if (process.env.NODE_ENV === "development") {
        console.error("[persona-analysis] 분석 결과 저장 실패", {
          code: saveError.code,
          message: saveError.message,
        });
      }

      return jsonResponse(
        { error: "분석 결과를 저장하지 못했어요. 잠시 후 다시 시도해주세요." },
        500,
      );
    }

    analysisSucceeded = true;
    logAnalysisSource("openai", {
      modelName: analysis.modelName,
      inputTokens: analysis.inputTokens,
      outputTokens: analysis.outputTokens,
      totalTokens: analysis.totalTokens,
    });

    return jsonResponse({
      result: analysis.result,
      source: "openai",
    });
  } catch (error) {
    logger.error(
      "analyze_persona_failed",
      {
        route: "/api/analyze-persona",
        userId: user.id,
        requestId: claimLogId,
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "unknown")
            : "unknown",
      },
      error,
    );
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[persona-analysis] OpenAI 분석 실패",
        safeErrorDetails(error),
      );
    }

    const status =
      error && typeof error === "object" && "status" in error
        ? (error as { status?: number }).status
        : undefined;

    if (status === 429) {
      return jsonResponse(
        { error: "분석 요청이 많아요. 잠시 후 다시 시도해주세요." },
        429,
      );
    }

    return jsonResponse(
      { error: "사진을 분석하지 못했어요. 잠시 후 다시 시도해주세요." },
      502,
    );
  } finally {
    if (claimLogId) {
      const { error: completionError } = await supabase.rpc(
        "complete_persona_analysis",
        {
          p_log_id: claimLogId,
          p_succeeded: analysisSucceeded,
        },
      );

      if (completionError && process.env.NODE_ENV === "development") {
        console.error("[persona-analysis] 분석 요청 완료 기록 실패", {
          code: completionError.code,
          message: completionError.message,
        });
      }
      if (completionError) {
        logger.error("analyze_persona_claim_complete_failed", {
          route: "/api/analyze-persona",
          userId: user.id,
          requestId: claimLogId,
          code: completionError.code ?? "unknown",
        });
      }
    }
  }
}
