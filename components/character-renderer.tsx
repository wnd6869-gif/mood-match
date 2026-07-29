"use client";

import { useState, type CSSProperties } from "react";
import { ANIMAL_MANIFEST } from "@/lib/character/character-manifest";
import type {
  AnimalId,
  CharacterDisplayVariant,
} from "@/lib/character/character-types";

export type CharacterRenderLayer = {
  src: string;
  transform?: string;
  rigPlacement?: { x: number; y: number; width: number; height: number; rotation?: number };
};

type Props = {
  animal: AnimalId;
  layers: readonly CharacterRenderLayer[];
  variant?: CharacterDisplayVariant;
  className?: string;
  alt?: string;
  background?: CSSProperties["background"];
};

const DESIGN_SIZE = 1024;

export default function CharacterRenderer({
  animal,
  layers,
  variant = "full",
  className = "",
  alt = "AI 동물 캐릭터",
  background = "transparent",
}: Props) {
  const [failed, setFailed] = useState(false);
  const display = ANIMAL_MANIFEST[animal].displayTransforms[variant];
  const xPercent = (display.x / DESIGN_SIZE) * 100;
  const yPercent = (display.y / DESIGN_SIZE) * 100;

  if (failed) {
    return (
      <div
        className={`grid place-items-center bg-coral-50 text-5xl ${className}`}
        role="img"
        aria-label={alt}
      >
        🐾
      </div>
    );
  }

  return (
    <div
      className={`relative isolate overflow-hidden ${className}`}
      style={{ background }}
      role="img"
      aria-label={alt}
      data-character-variant={variant}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translate3d(${xPercent}%, ${yPercent}%, 0) scale(${display.scale})`,
          transformOrigin: "50% 50%",
        }}
      >
        {layers.map(({ src, transform, rigPlacement }, index) => (
          // All layer files retain the approved 1024×1024 coordinate system.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${index}`}
            src={src}
            alt=""
            aria-hidden="true"
            className={rigPlacement ? "absolute object-fill" : "absolute inset-0 size-full object-contain"}
            style={rigPlacement ? {
              left: `${(rigPlacement.x / DESIGN_SIZE) * 100}%`,
              top: `${(rigPlacement.y / DESIGN_SIZE) * 100}%`,
              width: `${(rigPlacement.width / DESIGN_SIZE) * 100}%`,
              height: `${(rigPlacement.height / DESIGN_SIZE) * 100}%`,
              transform: `rotate(${rigPlacement.rotation ?? 0}deg) ${transform ?? ""}`,
              transformOrigin: "50% 50%",
            } : { transform }}
            draggable={false}
            onError={() => setFailed(true)}
          />
        ))}
      </div>
    </div>
  );
}
