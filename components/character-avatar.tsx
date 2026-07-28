import Image from "next/image";
import {
  getCharacterAvatar,
  type CharacterAvatarKey,
  CHARACTER_AVATARS,
} from "@/lib/character-avatar";

type CharacterAvatarProps = {
  animalTypes?: readonly { name: string; score?: number }[];
  personaTitle?: string;
  avatarKey?: CharacterAvatarKey;
  alt?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

export default function CharacterAvatar({
  animalTypes = [],
  personaTitle = "",
  avatarKey,
  alt,
  priority = false,
  className = "",
  imageClassName = "",
}: CharacterAvatarProps) {
  const avatar = avatarKey
    ? { key: avatarKey, ...CHARACTER_AVATARS[avatarKey] }
    : getCharacterAvatar(animalTypes, personaTitle);

  return (
    <div
      className={`relative overflow-hidden ${avatar.surfaceClass} ${className}`}
    >
      <Image
        src={avatar.src}
        alt={alt ?? `${personaTitle || avatar.label} 동물 캐릭터`}
        fill
        priority={priority}
        sizes="(max-width: 448px) 100vw, 448px"
        className={`object-cover ${imageClassName}`}
      />
    </div>
  );
}
