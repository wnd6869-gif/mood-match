import { getPersonaResultFromRecord, PERSONA_SELECT_COLUMNS, type PersonaRecord } from "@/lib/persona-record";
import type { createClient } from "@/lib/supabase/server";

export { createPersonaCastingSeed } from "@/lib/ai/persona-seed.mjs";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

export type AnalysisClaim = {
  status: "allowed" | "cached" | "in_progress" | "rate_limited";
  log_id?: string;
  remaining?: number;
};

export function parseAnalysisClaim(value: unknown): AnalysisClaim | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const statuses: AnalysisClaim["status"][] = [
    "allowed",
    "cached",
    "in_progress",
    "rate_limited",
  ];
  if (
    typeof candidate.status !== "string" ||
    !statuses.includes(candidate.status as AnalysisClaim["status"])
  ) return null;
  return {
    status: candidate.status as AnalysisClaim["status"],
    log_id: typeof candidate.log_id === "string" ? candidate.log_id : undefined,
    remaining: typeof candidate.remaining === "number" ? candidate.remaining : undefined,
  };
}

export async function getStoredPersona(supabase: Supabase, userId: string) {
  const { data, error } = await supabase
    .from("personas")
    .select(PERSONA_SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  return { record: error ? null : (data as PersonaRecord | null), error };
}

export function getCachedPersonaResult(record: PersonaRecord | null) {
  return getPersonaResultFromRecord(record);
}
