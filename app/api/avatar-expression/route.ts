import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const expressions = new Set(["gentle", "bright", "chic", "confident", "playful"]);
const roundMuzzleParts = new Set(["eyes", "eyebrows", "mouth"]);
const catParts = new Set(["eyes", "eyebrows", "nose-mouth"]);
const pointedMuzzleParts = new Set(["eyes", "eyebrows", "snout-mark"]);
const colors = /^#[0-9a-fA-F]{6}$/;

/**
 * Serves the immutable shared SVG source with a validated per-FaceRig color.
 * The asset is never copied or redrawn for an individual animal.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const expression = searchParams.get("expression") ?? "";
  const part = searchParams.get("part") ?? "";
  const color = searchParams.get("color") ?? "";
  const family = searchParams.get("family") ?? "round-muzzle";
  const acceptedParts = family === "cat" ? catParts : family === "pointed-muzzle" ? pointedMuzzleParts : roundMuzzleParts;
  if (!expressions.has(expression) || !acceptedParts.has(part) || !colors.test(color) || !["round-muzzle", "cat", "pointed-muzzle"].includes(family)) {
    return new Response("Not found", { status: 404 });
  }

  const file = family === "cat"
    ? path.join(process.cwd(), "public", "character-assets", "avatar-system", "cat", "v1", "expressions", expression, `${part}.svg`)
    : family === "pointed-muzzle"
      ? path.join(process.cwd(), "public", "character-assets", "avatar-system", "pointed-muzzle", "v1", "expressions", expression, `${part}.svg`)
    : path.join(process.cwd(), "public", "character-assets", "expressions", "round-muzzle", expression, `${part}.svg`);
  const source = await readFile(file, "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : part === "nose-mouth" ? "nose-mouth" : part === "snout-mark" ? "snout-mark" : "mouth";
  const svg = source.replaceAll(`var(--${variable}-color)`, color);
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
