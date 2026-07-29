import CharacterAvatar from "@/components/character-avatar";
import StoredImagePreview from "@/components/stored-image-preview";
import type { PhotoVisibility } from "@/lib/public-chat-profile";
import type { CharacterComposition } from "@/lib/character/character-types";

type PublicProfileVisualProps = {
  personaTitle: string;
  photoVisibility: PhotoVisibility;
  photoUrl: string | null;
  animalTypes?: readonly { name: string; score?: number }[];
  composition?: CharacterComposition;
  compact?: boolean;
};

export default function PublicProfileVisual({
  personaTitle,
  photoVisibility,
  photoUrl,
  animalTypes = [],
  composition,
  compact = false,
}: PublicProfileVisualProps) {
  const sizeClasses = compact
    ? "aspect-[16/10]"
    : "aspect-[4/3]";

  if (photoVisibility === "mutual" && photoUrl) {
    return (
      <StoredImagePreview
        src={photoUrl}
        alt={`${personaTitle} 공개 프로필 사진`}
        className={`${sizeClasses} rounded-none border-0 [&_img]:object-cover`}
      />
    );
  }

  return (
    <div className={`relative ${sizeClasses}`}>
      <CharacterAvatar
        animalTypes={animalTypes}
        personaTitle={personaTitle}
        composition={composition}
        className="absolute inset-0"
      />
      {photoVisibility === "mutual" && (
        <span className="absolute bottom-3 right-3 rounded-full bg-neutral-950/70 px-3 py-1.5 text-[0.65rem] font-bold text-white backdrop-blur-sm">
          🔒 서로 동의 시 실제 사진
        </span>
      )}
    </div>
  );
}
