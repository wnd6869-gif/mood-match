import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AVATAR_CATALOG_BY_BASE } from "@/lib/avatar-catalog";
import { resolveFixedAvatarLayers } from "@/lib/character/avatar-system";
import { ANIMAL_MANIFEST } from "@/lib/character/character-manifest";
import { logger } from "@/lib/server/logger";
import type {
  AvatarSelection,
  CharacterDisplayVariant,
} from "@/lib/character/character-types";

export const runtime = "nodejs";

const DESIGN_SIZE = 1024;
const SIZES = new Set([64, 128, 256]);
const VARIANTS = new Set<CharacterDisplayVariant>([
  "card",
  "avatar",
  "avatar-small",
]);
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

function getSelection(searchParams: URLSearchParams): AvatarSelection | null {
  const animalId = searchParams.get("animal") ?? "";
  const outfitBaseId = searchParams.get("outfit") ?? "";
  const faceRigVersion = searchParams.get("rig") ?? "";
  const expressionId = searchParams.get("expression") ?? "";
  const backgroundId = searchParams.get("background") ?? "";
  const glassesId = searchParams.get("glasses") || undefined;
  const effectId = searchParams.get("effect") || undefined;
  const catalogItem = AVATAR_CATALOG_BY_BASE[outfitBaseId];

  if (
    !catalogItem ||
    catalogItem.animalId !== animalId ||
    catalogItem.faceRigVersion !== faceRigVersion ||
    !catalogItem.allowedExpressions.includes(expressionId as AvatarSelection["expressionId"]) ||
    !catalogItem.allowedBackgrounds.includes(backgroundId as never) ||
    (glassesId !== undefined &&
      (glassesId !== "round-glasses" || !catalogItem.glassesEligible)) ||
    (effectId !== undefined && !catalogItem.allowedEffects.includes(effectId as never))
  ) {
    return null;
  }

  return {
    animalId: catalogItem.animalId,
    outfitBaseId,
    faceRigVersion,
    expressionId: expressionId as AvatarSelection["expressionId"],
    backgroundId,
    glassesId: glassesId as AvatarSelection["glassesId"],
    effectId: effectId as AvatarSelection["effectId"],
  };
}

async function readExpressionLayer(url: URL) {
  const expression = url.searchParams.get("expression") ?? "";
  const part = url.searchParams.get("part") ?? "";
  const family = url.searchParams.get("family") ?? "round-muzzle";
  const color = url.searchParams.get("color") ?? "";
  const root = path.join(process.cwd(), "public", "character-assets");
  const file = family === "cat"
    ? path.join(root, "avatar-system", "cat", "v1", "expressions", expression, `${part}.svg`)
    : family === "pointed-muzzle"
      ? path.join(root, "avatar-system", "pointed-muzzle", "v1", "expressions", expression, `${part}.svg`)
      : path.join(root, "expressions", "round-muzzle", expression, `${part}.svg`);
  const source = await readFile(file, "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : part === "nose-mouth" ? "nose-mouth" : part === "snout-mark" ? "snout-mark" : "mouth";
  return Buffer.from(source.replaceAll(`var(--${variable}-color)`, color));
}

async function readLayer(src: string, requestUrl: URL) {
  const url = new URL(src, requestUrl);
  if (url.pathname === "/api/avatar-expression") {
    return readExpressionLayer(url);
  }

  if (!url.pathname.startsWith("/character-assets/")) {
    throw new Error("Avatar layer is unavailable.");
  }

  const filePath = path.join(process.cwd(), "public", decodeURIComponent(url.pathname));
  return readFile(filePath);
}

async function prepareLayer(
  source: Buffer,
  placement?: { x: number; y: number; width: number; height: number; rotation?: number },
) {
  const width = Math.round(placement?.width ?? DESIGN_SIZE);
  const height = Math.round(placement?.height ?? DESIGN_SIZE);
  const rendered = sharp(source)
    .resize({ width, height, fit: "fill" })
    .rotate(placement?.rotation ?? 0, { background: TRANSPARENT })
    .png();
  const { data: buffer, info } = await rendered.toBuffer({
    resolveWithObject: true,
  });
  const rotatedWidth = info.width;
  const rotatedHeight = info.height;

  return {
    input: buffer,
    left: Math.round((placement?.x ?? 0) - (rotatedWidth - width) / 2),
    top: Math.round((placement?.y ?? 0) - (rotatedHeight - height) / 2),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const selection = getSelection(url.searchParams);
  const size = Number(url.searchParams.get("size"));
  const variant = url.searchParams.get("variant") as CharacterDisplayVariant;

  if (!selection || !SIZES.has(size) || !VARIANTS.has(variant)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const layers = resolveFixedAvatarLayers(selection);
    const composites = await Promise.all(
      layers.map(async (layer) =>
        prepareLayer(await readLayer(layer.src, url), layer.rigPlacement),
      ),
    );
    const display = ANIMAL_MANIFEST[selection.animalId].displayTransforms[variant];
    const cropSize = Math.round(DESIGN_SIZE / display.scale);
    const cropLeft = Math.max(
      0,
      Math.min(
        DESIGN_SIZE - cropSize,
        Math.round(DESIGN_SIZE / 2 - (DESIGN_SIZE / 2 + display.x) / display.scale),
      ),
    );
    const cropTop = Math.max(
      0,
      Math.min(
        DESIGN_SIZE - cropSize,
        Math.round(DESIGN_SIZE / 2 - (DESIGN_SIZE / 2 + display.y) / display.scale),
      ),
    );
    let canvas = await sharp({
      create: {
        width: DESIGN_SIZE,
        height: DESIGN_SIZE,
        channels: 4,
        background: TRANSPARENT,
      },
    })
      .png()
      .toBuffer();
    for (const composite of composites) {
      // Resolving one layer at a time keeps libvips' overlay bounds explicit
      // for rotated FaceRig layers while the CDN absorbs repeat requests.
      canvas = await sharp(canvas).composite([composite]).png().toBuffer();
    }
    const image = await sharp(canvas)
      .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const body = image.buffer.slice(
      image.byteOffset,
      image.byteOffset + image.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("avatar_thumbnail_failed", {
      route: "avatar_thumbnail",
      animal: selection?.animalId,
      outfit: selection?.outfitBaseId,
    }, error);
    return new Response("Avatar thumbnail unavailable", { status: 500 });
  }
}
