import type { CharacterDisplayVariant } from "@/lib/character/character-types";
import {
  recipeToAvatarSelection,
  type CharacterRecipe,
} from "@/lib/character-casting";

export type AvatarThumbnailSize = 64 | 128 | 256;

/** A stable, non-personal URL for a cached avatar configuration. */
export function getAvatarThumbnailUrl(
  recipe: CharacterRecipe,
  variant: Exclude<CharacterDisplayVariant, "full">,
  size: AvatarThumbnailSize,
) {
  const selection = recipeToAvatarSelection(recipe);
  const query = new URLSearchParams({
    animal: selection.animalId,
    outfit: selection.outfitBaseId,
    rig: selection.faceRigVersion,
    expression: selection.expressionId,
    background: selection.backgroundId,
    variant,
    size: String(size),
  });

  if (selection.glassesId) query.set("glasses", selection.glassesId);
  if (selection.effectId) query.set("effect", selection.effectId);

  return `/api/avatar-thumbnail?${query.toString()}`;
}
