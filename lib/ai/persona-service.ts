import OpenAI from "openai";
import { PERSONA_INSTRUCTIONS } from "@/lib/ai/persona-prompt";
import { PERSONA_RESULT_SCHEMA } from "@/lib/ai/persona-schema";
import {
  parsePersonaAnalysisResult,
  SAFE_PERSONA_RESULT,
  type PersonaAnalysisResult,
} from "@/lib/persona-analysis";
import {
  isPhotoEligible,
  parsePhotoEligibility,
  type PhotoEligibility,
} from "@/lib/photo-eligibility";
import { parsePhotoCastingSignals } from "@/lib/character-casting";

const OPENAI_MODEL = process.env.OPENAI_MODEL_NAME?.trim() || "gpt-5.6";

type AnalysisOutput = {
  result: PersonaAnalysisResult;
  castingSignals: ReturnType<typeof parsePhotoCastingSignals>;
  photoEligibility: PhotoEligibility;
  modelName: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export async function requestPersonaAnalysis(
  openai: OpenAI,
  imageDataUrl: string,
  safetyIdentifier: string,
): Promise<AnalysisOutput> {
  let modelName = OPENAI_MODEL;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let hasUsage = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await openai.responses.create({
      model: OPENAI_MODEL,
      store: false,
      safety_identifier: safetyIdentifier,
      reasoning: { effort: "low" },
      instructions: PERSONA_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "먼저 한 명의 얼굴과 두 눈·코·입이 모두 선명하게 보이는 사진인지 엄격히 판정한 뒤, 적합한 경우에만 사진에서 느껴지는 인상과 분위기를 바탕으로 동물 페르소나 결과를 만들어주세요.",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "auto",
            },
          ],
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "persona_analysis",
          strict: true,
          schema: PERSONA_RESULT_SCHEMA,
        },
      },
      max_output_tokens: 1_000,
    });

    modelName = response.model;

    if (response.usage) {
      hasUsage = true;
      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
      totalTokens += response.usage.total_tokens;
    }

    try {
      const rawOutput = JSON.parse(response.output_text) as unknown;
      const photoEligibility =
        rawOutput && typeof rawOutput === "object"
          ? parsePhotoEligibility(
              (rawOutput as Record<string, unknown>).photoEligibility,
            )
          : null;

      if (photoEligibility && !isPhotoEligible(photoEligibility)) {
        return {
          result: SAFE_PERSONA_RESULT,
          castingSignals: parsePhotoCastingSignals({}),
          photoEligibility,
          modelName,
          inputTokens: hasUsage ? inputTokens : null,
          outputTokens: hasUsage ? outputTokens : null,
          totalTokens: hasUsage ? totalTokens : null,
        };
      }

      const parsed = parsePersonaAnalysisResult(rawOutput, {
        requireVisualTraits: true,
      });

      if (photoEligibility && parsed) {
        return {
          result: parsed,
          castingSignals: parsePhotoCastingSignals((rawOutput as Record<string, unknown>).castingSignals),
          photoEligibility,
          modelName,
          inputTokens: hasUsage ? inputTokens : null,
          outputTokens: hasUsage ? outputTokens : null,
          totalTokens: hasUsage ? totalTokens : null,
        };
      }
    } catch {
      // Retry once below. Never log the model output because it came from an image.
    }
  }

  throw new Error("OpenAI photo eligibility output was invalid");
}
