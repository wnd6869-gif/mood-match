"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ActionButton } from "@/components/action";
import AppShell from "@/components/app-shell";
import BackLink from "@/components/back-link";
import StepProgress from "@/components/step-progress";
import {
  ImagePreviewError,
  processProfilePhoto,
} from "@/lib/image-preview";
import {
  FORCE_REANALYSIS_SESSION_KEY,
} from "@/lib/persona-analysis";
import {
  PROFILE_PHOTO_BUCKET,
  PROFILE_PHOTO_FILE_NAMES,
  PROFILE_PHOTO_MAX_SIZE_LABEL,
  type ProcessedProfilePhoto,
} from "@/lib/profile-photo";
import { prepareForNewPersonaAnalysis } from "@/lib/prototype-storage";
import { createClient } from "@/lib/supabase/client";

type ProfilePhotoUploadProps = {
  initialPhotoUrl: string | null;
  hasExistingPersona: boolean;
};

const PROFILE_PHOTO_FILE_NAME = "profile.webp";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

type StorageUploadError = {
  name?: string;
  message?: string;
  status?: number;
  statusCode?: string;
};

function getKoreanUploadError(error: StorageUploadError) {
  const message = error.message?.toLowerCase() ?? "";
  const status = error.status;
  const statusCode = error.statusCode;

  if (
    status === 404 ||
    statusCode === "404" ||
    message.includes("bucket not found")
  ) {
    return "프로필 사진 저장소를 찾을 수 없어요. Supabase 버킷 설정을 확인해주세요.";
  }

  if (
    status === 401 ||
    status === 403 ||
    statusCode === "401" ||
    statusCode === "403" ||
    message.includes("row-level security") ||
    message.includes("unauthorized")
  ) {
    return "사진 업로드 권한이 없어요. Storage RLS 정책을 확인해주세요.";
  }

  if (
    status === 413 ||
    statusCode === "413" ||
    message.includes("maximum allowed size") ||
    message.includes("payload too large")
  ) {
    return `사진 용량이 너무 커요. ${PROFILE_PHOTO_MAX_SIZE_LABEL} 이하의 사진을 선택해주세요.`;
  }

  if (
    message.includes("mime type") ||
    message.includes("content type")
  ) {
    return "지원하지 않는 이미지 형식이에요. JPEG, PNG 또는 WebP 사진을 선택해주세요.";
  }

  return "사진을 업로드하지 못했어요. 잠시 후 다시 시도해주세요.";
}

function getKoreanDeleteError(error: StorageUploadError) {
  const message = error.message?.toLowerCase() ?? "";

  if (
    error.status === 401 ||
    error.status === 403 ||
    error.statusCode === "401" ||
    error.statusCode === "403" ||
    message.includes("row-level security") ||
    message.includes("unauthorized")
  ) {
    return "사진 삭제 권한을 확인하지 못했어요. 다시 로그인해주세요.";
  }

  return "사진을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.";
}

export default function ProfilePhotoUpload({
  initialPhotoUrl,
  hasExistingPersona,
}: ProfilePhotoUploadProps) {
  const router = useRouter();
  const objectUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(initialPhotoUrl);
  const [processedPhoto, setProcessedPhoto] =
    useState<ProcessedProfilePhoto | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const imageFile = event.target.files?.[0];

    if (!imageFile) {
      return;
    }

    setImageError(null);
    setStatusMessage("업로드에 맞게 이미지 크기를 조절하고 있어요.");
    setIsProcessing(true);

    try {
      const nextPhoto = await processProfilePhoto(imageFile);
      const nextObjectUrl = URL.createObjectURL(nextPhoto.blob);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      objectUrlRef.current = nextObjectUrl;
      setPreviewUrl(nextObjectUrl);
      setProcessedPhoto(nextPhoto);
      setSelectedFileName(imageFile.name);
      setStatusMessage("업로드 준비가 완료됐어요.");
    } catch (error) {
      setStatusMessage(null);
      setImageError(
        error instanceof ImagePreviewError
          ? error.message
          : "이미지를 처리하지 못했어요. 다른 사진을 선택해주세요.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAnalyze() {
    if (!previewUrl || isProcessing || isUploading) {
      return;
    }

    if (!processedPhoto) {
      prepareForNewPersonaAnalysis();
      router.push("/analyzing");
      return;
    }

    const shouldForceReanalysis =
      hasExistingPersona &&
      window.confirm(
        "새 사진을 분석하면 OpenAI 호출 비용이 발생할 수 있어요. 사진을 교체하고 재분석할까요?",
      );

    if (hasExistingPersona && !shouldForceReanalysis) {
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setImageError("Supabase 환경변수 설정을 확인해주세요.");
      return;
    }

    setImageError(null);
    setStatusMessage("프로필 사진을 안전하게 업로드하고 있어요.");
    setIsUploading(true);

    const [
      {
        data: { session },
        error: sessionError,
      },
      {
        data: { user },
        error: userError,
      },
    ] = await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getUser(),
    ]);

    if (IS_DEVELOPMENT) {
      console.info("[profile-photo] 인증 상태 확인", {
        hasSession: Boolean(session),
        idsMatch: Boolean(
          session?.user.id && user?.id && session.user.id === user.id,
        ),
        sessionError: sessionError?.message ?? null,
        userError: userError?.message ?? null,
      });
    }

    if (
      sessionError ||
      userError ||
      !session ||
      !user ||
      session.user.id !== user.id
    ) {
      if (IS_DEVELOPMENT) {
        console.error("[profile-photo] 유효한 로그인 세션이 없습니다.", {
          hasSession: Boolean(session),
          hasUser: Boolean(user),
          idsMatch: session?.user.id === user?.id,
          sessionError: sessionError?.message ?? null,
          userError: userError?.message ?? null,
        });
      }
      setIsUploading(false);
      router.replace("/login");
      router.refresh();
      return;
    }

    const objectPath = `${user.id}/${PROFILE_PHOTO_FILE_NAME}`;

    if (IS_DEVELOPMENT) {
      console.info("[profile-photo] Storage 업로드 시작", {
        bucket: PROFILE_PHOTO_BUCKET,
        pathMatchesUser: objectPath.split("/")[0] === user.id,
        contentType: processedPhoto.contentType,
        sizeBytes: processedPhoto.blob.size,
        maxSizeBytes: 8 * 1024 * 1024,
        upsert: true,
      });
    }

    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(objectPath, processedPhoto.blob, {
        contentType: processedPhoto.contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      if (IS_DEVELOPMENT) {
        console.error("[profile-photo] Storage 업로드 실패", {
          error: uploadError.name,
          message: uploadError.message,
          status: uploadError.status,
          statusCode: uploadError.statusCode,
          bucket: PROFILE_PHOTO_BUCKET,
          contentType: processedPhoto.contentType,
          sizeBytes: processedPhoto.blob.size,
          upsert: true,
        });
      }

      setImageError(getKoreanUploadError(uploadError));
      setStatusMessage(null);
      setIsUploading(false);
      return;
    }

    const oldPaths = PROFILE_PHOTO_FILE_NAMES.filter(
      (candidate) => candidate !== PROFILE_PHOTO_FILE_NAME,
    ).map((candidate) => `${user.id}/${candidate}`);

    const { error: cleanupError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove(oldPaths);

    if (cleanupError && IS_DEVELOPMENT) {
      console.error("[profile-photo] 이전 확장자 파일 정리 실패", {
        error: cleanupError.name,
        message: cleanupError.message,
        status: cleanupError.status,
        statusCode: cleanupError.statusCode,
      });
    }

    prepareForNewPersonaAnalysis();

    if (shouldForceReanalysis) {
      window.sessionStorage.setItem(
        FORCE_REANALYSIS_SESSION_KEY,
        "true",
      );
    }

    setStatusMessage("업로드가 완료됐어요. 분석 화면으로 이동할게요.");
    router.push("/analyzing");
  }

  async function handleDeleteStoredPhoto() {
    if (isProcessing || isUploading || isDeleting || processedPhoto) {
      return;
    }

    if (!window.confirm("저장된 프로필 사진을 삭제할까요?")) {
      return;
    }

    const supabase = createClient();

    if (!supabase) {
      setImageError("Supabase 환경변수 설정을 확인해주세요.");
      return;
    }

    setIsDeleting(true);
    setImageError(null);
    setStatusMessage("저장된 프로필 사진을 삭제하고 있어요.");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsDeleting(false);
      router.replace("/login");
      router.refresh();
      return;
    }

    const paths = PROFILE_PHOTO_FILE_NAMES.map(
      (candidate) => `${user.id}/${candidate}`,
    );
    const { error: deleteError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove(paths);

    if (deleteError) {
      if (IS_DEVELOPMENT) {
        console.error("[profile-photo] Storage 사진 삭제 실패", {
          error: deleteError.name,
          message: deleteError.message,
          status: deleteError.status,
          statusCode: deleteError.statusCode,
          bucket: PROFILE_PHOTO_BUCKET,
        });
      }

      setImageError(getKoreanDeleteError(deleteError));
      setStatusMessage(null);
      setIsDeleting(false);
      return;
    }

    setPreviewUrl(null);
    setSelectedFileName(null);
    setStatusMessage("저장된 프로필 사진을 삭제했어요.");
    setIsDeleting(false);
    router.refresh();
  }

  const isBusy = isProcessing || isUploading || isDeleting;

  return (
    <AppShell>
      <BackLink href="/" ariaLabel="랜딩 화면으로 돌아가기" />
      <StepProgress current={1} total={5} label="사진 선택" />

      <header className="mt-7">
        <p className="text-sm font-semibold text-coral-600">
          나의 분위기 알아보기
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-neutral-900">
          사진을 선택해주세요
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          얼굴이 선명하게 보이는 사진일수록 분위기를 더 자연스럽게 표현할 수
          있어요.
        </p>
      </header>

      <div className="mt-7">
        <input
          id="persona-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="peer sr-only"
          disabled={isBusy}
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={handleImageChange}
        />

        <label
          htmlFor="persona-image"
          aria-label={
            previewUrl ? "현재 사진 대신 다른 사진 선택하기" : "사진 선택하기"
          }
          className={`relative flex aspect-[4/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed bg-white shadow-sm transition-all duration-200 hover:border-coral-400 hover:bg-coral-50/40 peer-focus-visible:ring-2 peer-focus-visible:ring-coral-400 peer-focus-visible:ring-offset-2 active:scale-[0.99] ${
            imageError ? "border-red-300" : "border-neutral-300"
          } ${isBusy ? "pointer-events-none opacity-70" : ""}`}
        >
          {previewUrl ? (
            <>
              <Image
                src={previewUrl}
                alt={`프로필 사진 미리보기: ${selectedFileName ?? "저장된 사진"}`}
                fill
                unoptimized
                sizes="(max-width: 448px) calc(100vw - 40px), 448px"
                className="bg-neutral-100 object-contain"
              />
              <span className="absolute bottom-4 flex min-h-10 items-center rounded-full bg-neutral-900/80 px-4 text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
                {isProcessing ? "이미지 크기 조절 중..." : "사진 다시 선택"}
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center px-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-coral-50 text-coral-600">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-7"
                >
                  <path
                    d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="mt-4 text-base font-semibold text-neutral-900">
                사진 선택하기
              </span>
              <span className="mt-1 text-sm text-neutral-500">
                갤러리에서 이미지를 골라주세요
              </span>
              <span className="mt-2 text-xs text-neutral-400">
                JPEG · PNG · WebP · 최대 {PROFILE_PHOTO_MAX_SIZE_LABEL}
              </span>
            </span>
          )}
        </label>

        {previewUrl && (
          <div className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-xs shadow-sm">
            <span className="min-w-0 truncate font-medium text-neutral-600">
              {selectedFileName ?? "Storage에 저장된 프로필 사진"}
            </span>
            <span className="shrink-0 font-semibold text-coral-600">
              {processedPhoto ? "업로드 준비 완료" : "저장됨"}
            </span>
          </div>
        )}

        {previewUrl && !processedPhoto && (
          <button
            type="button"
            disabled={isBusy}
            onClick={handleDeleteStoredPhoto}
            className="mt-3 min-h-11 w-full cursor-pointer rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-600 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
            aria-label="Supabase Storage에 저장된 프로필 사진 삭제하기"
          >
            {isDeleting ? "사진 삭제 중..." : "저장된 사진 삭제"}
          </button>
        )}

        {statusMessage && (
          <p
            role="status"
            aria-live="polite"
            className="mt-3 rounded-2xl bg-coral-50 px-4 py-3 text-sm leading-5 text-coral-700"
          >
            {statusMessage}
          </p>
        )}

        {imageError && (
          <p
            role="alert"
            className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
          >
            {imageError}
          </p>
        )}
      </div>

      <ActionButton
        disabled={!previewUrl || isBusy}
        onClick={handleAnalyze}
        className="mt-6"
        aria-label="선택한 사진을 업로드하고 페르소나 분석 시작하기"
      >
        {isProcessing
          ? "이미지 준비 중..."
          : isUploading
            ? "사진 업로드 중..."
            : isDeleting
              ? "사진 삭제 중..."
            : "이 사진으로 분석하기"}
      </ActionButton>

      <p className="mt-3 text-center text-xs leading-5 text-neutral-400">
        사진은 비공개로 저장되며 화면에는 짧은 시간만 유효한 주소를 사용해요.
      </p>
    </AppShell>
  );
}
