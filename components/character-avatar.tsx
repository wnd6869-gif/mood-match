import Image from "next/image";
import {
  getCharacterAvatar,
  type CharacterAvatarKey,
  CHARACTER_AVATARS,
} from "@/lib/character-avatar";
import ComposedCharacter from "@/components/composed-character";
import type { CharacterComposition } from "@/lib/character/character-types";
import type { CharacterDisplayVariant } from "@/lib/character/character-types";
import { mapAvatarInputToCharacter } from "@/lib/character/character-mapper";

type CharacterAvatarProps = {
  animalTypes?: readonly { name: string; score?: number }[];
  personaTitle?: string;
  avatarKey?: CharacterAvatarKey;
  alt?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  composition?: CharacterComposition;
  variant?: CharacterDisplayVariant;
};

export default function CharacterAvatar({
  animalTypes = [],
  personaTitle = "",
  avatarKey,
  alt,
  priority = false,
  className = "",
  imageClassName = "",
  composition,
  variant = "full",
}: CharacterAvatarProps) {
  if (composition) {
    return (
      <ComposedCharacter
        composition={composition}
        variant={variant}
        alt={alt ?? `${personaTitle || "AI"} 동물 캐릭터`}
        className={className}
      />
    );
  }

  if (!avatarKey) {
    return (
      <ComposedCharacter
        composition={mapAvatarInputToCharacter(animalTypes, personaTitle)}
        variant={variant}
        alt={alt ?? `${personaTitle || "AI"} 동물 캐릭터`}
        className={className}
      />
    );
  }
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
