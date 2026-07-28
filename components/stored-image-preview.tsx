import Image from "next/image";

type StoredImagePreviewProps = {
  src: string | null;
  variant?: "avatar" | "card";
  className?: string;
  alt?: string;
};

export default function StoredImagePreview({
  src,
  variant = "card",
  className = "",
  alt = "비공개 Storage에 저장된 프로필 사진",
}: StoredImagePreviewProps) {
  const isAvatar = variant === "avatar";

  return (
    <div
      className={`relative overflow-hidden bg-neutral-100 ${
        isAvatar
          ? "size-16 rounded-full"
          : "aspect-[4/3] w-full rounded-3xl border border-neutral-200"
      } ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={isAvatar ? "64px" : "(max-width: 448px) calc(100vw - 40px), 448px"}
          className="object-contain"
        />
      ) : (
        <div
          role="img"
          aria-label="저장된 업로드 사진이 없습니다"
          className="flex size-full items-center justify-center text-neutral-400"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className={isAvatar ? "size-6" : "size-10"}
          >
            <path
              d="M5 5h14v14H5V5Zm2.5 10 3-3 2.5 2.5 1.5-1.5 2 2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
          </svg>
        </div>
      )}
    </div>
  );
}
