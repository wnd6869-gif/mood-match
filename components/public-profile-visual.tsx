import StoredImagePreview from "@/components/stored-image-preview";
import type { PhotoVisibility } from "@/lib/public-chat-profile";

type PublicProfileVisualProps = {
  personaTitle: string;
  photoVisibility: PhotoVisibility;
  photoUrl: string | null;
  compact?: boolean;
};

export default function PublicProfileVisual({
  personaTitle,
  photoVisibility,
  photoUrl,
  compact = false,
}: PublicProfileVisualProps) {
  const sizeClasses = compact
    ? "aspect-[16/10]"
    : "aspect-[4/3]";

  if (photoVisibility === "public") {
    return (
      <StoredImagePreview
        src={photoUrl}
        alt={`${personaTitle} 공개 프로필 사진`}
        className={`${sizeClasses} rounded-none border-0 [&_img]:object-cover`}
      />
    );
  }

  if (photoVisibility === "mutual") {
    return (
      <div
        role="img"
        aria-label="서로 동의하면 실제 사진이 공개되는 프로필"
        className={`relative flex ${sizeClasses} items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-200 via-coral-50 to-neutral-100 px-6 text-center`}
      >
        <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-300/70 blur-xl" />
        <div className="relative">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm">
            🔒
          </span>
          <p className="mt-3 text-xs font-bold text-neutral-700">
            서로 동의하면 실제 사진 공개
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${personaTitle} 페르소나 스타일 카드`}
      className={`flex ${sizeClasses} flex-col items-center justify-center bg-gradient-to-br from-coral-50 via-white to-neutral-100 px-6 text-center`}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
        ✦
      </span>
      <p className="mt-3 text-[0.65rem] font-bold tracking-[0.16em] text-coral-600">
        AI PERSONA
      </p>
      <p className="mt-1 line-clamp-2 text-lg font-bold text-neutral-900">
        {personaTitle}
      </p>
    </div>
  );
}
