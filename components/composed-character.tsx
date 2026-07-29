"use client";

import { useMemo } from "react";
import CharacterRenderer, { type CharacterRenderLayer } from "@/components/character-renderer";
import {
  FACE_ACCESSORY_ASSETS,
  ANIMAL_LAYER_TRANSFORMS,
  ANIMAL_MANIFEST,
  BACKGROUND_ASSETS,
  EYE_ASSETS,
  FACE_EFFECT_ASSETS,
  FOREGROUND_ASSETS,
  MOUTH_ASSETS,
  OUTFIT_ASSETS,
} from "@/lib/character/character-manifest";
import {
  avatarSelectionFromComposition,
  resolveFixedAvatarLayers,
} from "@/lib/character/avatar-system";
import type {
  CharacterComposition,
  CharacterDisplayVariant,
} from "@/lib/character/character-types";

const FALLBACK_BACKGROUNDS: Record<CharacterComposition["background"], string> = {
  "warm-cafe": "linear-gradient(145deg,#f6d5b9,#fff7ea)",
  "cozy-room": "linear-gradient(145deg,#ead6ca,#fff8ef)",
  "green-park": "linear-gradient(145deg,#cfe5cc,#f7f4d7)",
  "evening-sky": "linear-gradient(145deg,#9e8bb8,#f2b6a0)",
  "quiet-library": "linear-gradient(145deg,#b28b72,#f0dfc2)",
  "minimal-coral": "linear-gradient(145deg,#ffd9d2,#fff4ec)",
  "minimal-sage": "linear-gradient(145deg,#d9e3cf,#f8f4e8)",
  "minimal-lavender": "linear-gradient(145deg,#ddd3ee,#fff4f1)",
};

type Props = {
  composition: CharacterComposition;
  variant?: CharacterDisplayVariant;
  className?: string;
  alt?: string;
};

export default function ComposedCharacter({
  composition,
  variant = "full",
  className = "",
  alt = "AI 동물 캐릭터",
}: Props) {
  const layers = useMemo(() => {
    // Complete animal+outfit bases use the locked round-muzzle v1 rig. This
    // keeps the same AvatarSelection reproducible across cards and chat.
    const fixedSelection = avatarSelectionFromComposition(composition);
    if (fixedSelection) return resolveFixedAvatarLayers(fixedSelection);

    const transforms = ANIMAL_LAYER_TRANSFORMS[composition.animal];
    return [
      { src: BACKGROUND_ASSETS[composition.background] },
      { src: ANIMAL_MANIFEST[composition.animal].base },
      { src: EYE_ASSETS[composition.eyes], transform: transforms?.eyes },
      { src: MOUTH_ASSETS[composition.mouth], transform: transforms?.mouth },
      { src: composition.faceEffect ? FACE_EFFECT_ASSETS[composition.faceEffect] : undefined },
      { src: OUTFIT_ASSETS[composition.outfitBase] },
      { src: composition.faceAccessory ? FACE_ACCESSORY_ASSETS[composition.faceAccessory] : undefined, transform: transforms?.accessories },
      { src: composition.foregroundEffect ? FOREGROUND_ASSETS[composition.foregroundEffect] : undefined },
    ].filter((value): value is CharacterRenderLayer => Boolean(value.src));
  }, [composition]);

  return (
    <CharacterRenderer
      animal={composition.animal}
      layers={layers}
      variant={variant}
      className={className}
      alt={alt}
      background={FALLBACK_BACKGROUNDS[composition.background]}
    />
  );
}
