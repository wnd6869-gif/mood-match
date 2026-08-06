import { NextResponse } from "next/server";
import { requireRouteUser } from "@/lib/api/route-guard";
import { getPhotoRevealStatusFromRecord } from "@/lib/photo-reveal";
import { logger } from "@/lib/server/logger";
import { downloadProfilePhoto } from "@/lib/supabase/profile-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const PRIVATE_IMAGE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, noimageindex",
};

function hiddenResponse() {
  // Use the same response for a missing photo and a missing/withdrawn consent
  // so this endpoint cannot be used to probe another member's photo state.
  return new NextResponse(null, { status: 404, headers: PRIVATE_IMAGE_HEADERS });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const { conversationId } = await params;

  if (!UUID_PATTERN.test(conversationId)) {
    return hiddenResponse();
  }

  const guard = await requireRouteUser(request, {
    unauthorizedMessage: "로그인 후 사진을 확인할 수 있어요.",
  });
  if (!guard.ok) {
    return hiddenResponse();
  }

  const { data, error } = await guard.supabase.rpc(
    "get_photo_reveal_status",
    { target_conversation_id: conversationId },
  );
  const status = getPhotoRevealStatusFromRecord(data);

  if (error || !status?.revealed) {
    if (error) {
      logger.error("photo_reveal_status_failed", {
        route: "/api/photo-reveal/[conversationId]",
        action: "get_photo_reveal_status",
        userId: guard.user.id,
        code: error.code ?? "rpc_error",
      });
    }
    return hiddenResponse();
  }

  const photo = await downloadProfilePhoto(guard.supabase, status.otherUserId);

  if (!photo) {
    return hiddenResponse();
  }

  return new NextResponse(photo.blob, {
    headers: {
      ...PRIVATE_IMAGE_HEADERS,
      "Content-Type": photo.contentType,
    },
  });
}
