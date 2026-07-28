import {
  ACCESSORY_ASSETS,
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

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export function getCharacterLayerPaths(composition: CharacterComposition) {
  return [
    BACKGROUND_ASSETS[composition.background],
    ANIMAL_MANIFEST[composition.animal].base,
    EYE_ASSETS[composition.eyes],
    MOUTH_ASSETS[composition.mouth],
    composition.faceEffect ? FACE_EFFECT_ASSETS[composition.faceEffect] : undefined,
    OUTFIT_ASSETS[composition.outfit],
    composition.headAccessory
      ? ACCESSORY_ASSETS[composition.headAccessory] : undefined,
    composition.faceAccessory
      ? ACCESSORY_ASSETS[composition.faceAccessory] : undefined,
    composition.neckAccessory
      ? ACCESSORY_ASSETS[composition.neckAccessory] : undefined,
    composition.handProp ? PROP_ASSETS[composition.handProp] : undefined,
    composition.foregroundEffect
      ? FOREGROUND_ASSETS[composition.foregroundEffect] : undefined,
  ].filter((value): value is string => Boolean(value));
}

export async function exportCharacterImage(
  composition: CharacterComposition,
  type: "image/png" | "image/webp" = "image/webp",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas를 사용할 수 없습니다.");

  const images = await Promise.all(getCharacterLayerPaths(composition).map(loadImage));
  images.forEach((image) => context.drawImage(image, 0, 0, 1024, 1024));
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("이미지 내보내기에 실패했습니다.")),
      type,
      0.92,
    ),
  );
}
