"use client";

import { useMemo, useState } from "react";
import {
  ACCESSORY_ASSETS,
  ANIMAL_LAYER_TRANSFORMS,
  ANIMAL_MANIFEST,
  BACKGROUND_ASSETS,
  EYE_ASSETS,
  FACE_EFFECT_ASSETS,
  FOREGROUND_ASSETS,
  MOUTH_ASSETS,
  OUTFIT_ASSETS,
  PROP_ASSETS,
} from "@/lib/character/character-manifest";
import type { CharacterComposition } from "@/lib/character/character-types";

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
  className?: string;
  alt?: string;
};

export default function ComposedCharacter({
  composition,
  className = "",
  alt = "AI 동물 캐릭터",
}: Props) {
  const [failed, setFailed] = useState(false);
  const layers = useMemo(() => {
    const transforms = ANIMAL_LAYER_TRANSFORMS[composition.animal];
    return [
      { src: BACKGROUND_ASSETS[composition.background] },
      { src: ANIMAL_MANIFEST[composition.animal].base },
      { src: EYE_ASSETS[composition.eyes], transform: transforms?.eyes },
      { src: MOUTH_ASSETS[composition.mouth], transform: transforms?.mouth },
      { src: composition.faceEffect ? FACE_EFFECT_ASSETS[composition.faceEffect] : undefined },
      { src: OUTFIT_ASSETS[composition.outfit] },
      { src: composition.headAccessory ? ACCESSORY_ASSETS[composition.headAccessory] : undefined, transform: transforms?.accessories },
      { src: composition.faceAccessory ? ACCESSORY_ASSETS[composition.faceAccessory] : undefined, transform: transforms?.accessories },
      { src: composition.neckAccessory ? ACCESSORY_ASSETS[composition.neckAccessory] : undefined },
      { src: composition.handProp ? PROP_ASSETS[composition.handProp] : undefined },
      { src: composition.foregroundEffect ? FOREGROUND_ASSETS[composition.foregroundEffect] : undefined },
    ].filter((value): value is { src: string; transform?: string } => Boolean(value.src));
  }, [composition]);

  if (failed) {
    return (
      <div className={`grid place-items-center bg-coral-50 text-5xl ${className}`} role="img" aria-label={alt}>
        🐾
      </div>
    );
  }

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background: FALLBACK_BACKGROUNDS[composition.background] }}
      role="img"
      aria-label={alt}
    >
      {layers.map(({ src, transform }, index) => (
        // Fixed 1024px layers share a coordinate system; native img avoids Next
        // optimization changing alpha edges between overlays.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${src}-${index}`}
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-contain"
          style={{ transform }}
          draggable={false}
          onError={() => setFailed(true)}
        />
      ))}
    </div>
  );
}
