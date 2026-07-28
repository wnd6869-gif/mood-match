import "server-only";

import { notFound, redirect } from "next/navigation";
import {
  isAdminRole,
} from "@/lib/admin-shared";
import { createClient } from "@/lib/supabase/server";

export {
  ADMIN_ROLES,
  ADMIN_ROLE_LABELS,
  isAdminRole,
  isModerationStatus,
  MODERATION_STATUSES,
  MODERATION_STATUS_LABELS,
  type AdminRole,
  type ModerationStatus,
} from "@/lib/admin-shared";

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

export function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function asNullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatAdminDate(value: unknown, includeTime = true) {
  if (typeof value !== "string") {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit" }
      : {}),
  }).format(date);
}

export async function getAdminSession() {
  const supabase = await createClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: isAdmin }, { data: role }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("get_admin_role"),
  ]);

  if (isAdmin !== true || !isAdminRole(role)) {
    return null;
  }

  return { supabase, userId: user.id, role };
}

export async function requireAdmin() {
  const supabase = await createClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: isAdmin }, { data: role }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("get_admin_role"),
  ]);

  if (isAdmin !== true || !isAdminRole(role)) {
    notFound();
  }

  return { supabase, userId: user.id, role };
}
