import {
  FACE_ACCESSORY_ASSETS,
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
  type ResolvedAvatarLayer,
} from "@/lib/character/avatar-system";
import type { CharacterComposition } from "@/lib/character/character-types";

type ExportLayer = ResolvedAvatarLayer & { transform?: string };

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export function getCharacterRenderLayers(composition: CharacterComposition): ExportLayer[] {
  const fixedSelection = avatarSelectionFromComposition(composition);
  if (fixedSelection) return resolveFixedAvatarLayers(fixedSelection);
  return [
    BACKGROUND_ASSETS[composition.background],
    ANIMAL_MANIFEST[composition.animal].base,
    EYE_ASSETS[composition.eyes],
    MOUTH_ASSETS[composition.mouth],
    composition.faceEffect ? FACE_EFFECT_ASSETS[composition.faceEffect] : undefined,
    OUTFIT_ASSETS[composition.outfitBase],
    composition.faceAccessory
      ? FACE_ACCESSORY_ASSETS[composition.faceAccessory] : undefined,
    composition.foregroundEffect
      ? FOREGROUND_ASSETS[composition.foregroundEffect] : undefined,
  ].filter((src): src is string => Boolean(src))
    .map((src) => ({ src }));
}

export function getCharacterLayerPaths(composition: CharacterComposition) {
  return getCharacterRenderLayers(composition).map((layer) => layer.src);
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

  const layers = getCharacterRenderLayers(composition);
  const images = await Promise.all(layers.map(({ src }) => loadImage(src)));
  images.forEach((image, index) => {
    const placement = layers[index].rigPlacement;
    if (!placement) {
      context.drawImage(image, 0, 0, 1024, 1024);
      return;
    }
    context.save();
    const centerX = placement.x + placement.width / 2;
    const centerY = placement.y + placement.height / 2;
    context.translate(centerX, centerY);
    context.rotate(((placement.rotation ?? 0) * Math.PI) / 180);
    context.drawImage(image, -placement.width / 2, -placement.height / 2, placement.width, placement.height);
    context.restore();
  });
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("이미지 내보내기에 실패했습니다.")),
      type,
      0.92,
    ),
  );
}
