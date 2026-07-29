"use client";

import ComposedCharacter from "@/components/composed-character";
import { recipeToComposition, type CharacterRecipe } from "@/lib/character-casting";
import type { CharacterDisplayVariant } from "@/lib/character/character-types";

type Props = {
  recipe: CharacterRecipe;
  size: 40 | 64 | 128 | 256;
  shape?: "square" | "circle";
  priority?: boolean;
  className?: string;
  alt?: string;
};

const variantForSize = (size: Props["size"]): CharacterDisplayVariant =>
  size <= 40 ? "avatar-small" : size <= 64 ? "avatar" : size <= 128 ? "card" : "full";

/** Renders only persisted recipe data; no animal/style picker is involved. */
export default function AvatarRenderer({
  recipe,
  size,
  shape = "square",
  className = "",
  alt = "AI 동물 캐릭터",
}: Props) {
  return (
    <ComposedCharacter
      composition={recipeToComposition(recipe)}
      variant={variantForSize(size)}
      alt={alt}
      className={`shrink-0 ${shape === "circle" ? "rounded-full" : "rounded-2xl"} ${className}`}
    />
  );
}
