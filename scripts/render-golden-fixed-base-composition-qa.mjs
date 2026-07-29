import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const expressions = path.join(approval, "expressions", "png");
const out = path.join(approval, "mvp", "qa", "no-head-accessory");
const base = path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png");
const backgrounds = {
  minimalCream: path.join(png, "backgrounds", "minimal-cream.png"),
  greenPark: path.join(png, "backgrounds", "green-park.png"),
};
const glasses = path.join(png, "accessories", "round-glasses.png");
const warmSparkles = path.join(root, "public", "character-assets", "foreground-effects", "original", "warm-sparkles-v1.png");
const FACE_OFFSET_Y = -108;
const cases = [
  ["gentle-base", "gentle · base", "gentle", backgrounds.minimalCream],
  ["chic-glasses", "chic · round glasses", "chic", backgrounds.minimalCream, glasses],
  ["bright-background", "bright · green park", "bright", backgrounds.greenPark],
  ["playful-sparkles", "playful · warm sparkles", "playful", backgrounds.minimalCream, undefined, warmSparkles],
];
const label = (text, width = 330, height = 38) => Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="8" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#2b2522">${text}</text></svg>`);
const circle = Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white"/></svg>');

async function compose(expression, background, faceAccessory, foregroundEffect) {
  const { width, height } = await sharp(base).metadata();
  const faces = await Promise.all(["eyes", "eyebrows", "mouth"].map(async (part) => ({ input: await sharp(path.join(expressions, `${part}-${expression}.png`)).resize(width, height).png().toBuffer(), left: 0, top: FACE_OFFSET_Y })));
  const face = faceAccessory ? [{ input: await sharp(faceAccessory).resize(width, height).png().toBuffer(), left: 0, top: FACE_OFFSET_Y }] : [];
  const effect = foregroundEffect ? [{ input: await sharp(foregroundEffect).resize(width, height).png().toBuffer() }] : [];
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([{ input: await sharp(background).resize(width, height).png().toBuffer() }, { input: await sharp(base).png().toBuffer() }, ...faces, ...face, ...effect])
    .png().toBuffer();
}

await fs.mkdir(out, { recursive: true });
const board = [];
for (const [index, [slug, title, expression, background, face, effect]] of cases.entries()) {
  const image = await compose(expression, background, face, effect);
  await fs.writeFile(path.join(out, `${slug}.png`), image);
  const p256 = await sharp(image).resize(256, 256).png().toBuffer();
  const p128 = await sharp(image).resize(128, 128).png().toBuffer();
  const p64 = await sharp(image).resize(64, 64).png().toBuffer();
  const pCircle = await sharp(p64).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
  const top = 20 + index * 320;
  board.push(
    { input: label(title), left: 20, top }, { input: p256, left: 20, top: top + 38 }, { input: p128, left: 318, top: top + 88 },
    { input: p64, left: 484, top: top + 120 }, { input: pCircle, left: 584, top: top + 120 },
    { input: label("256", 50, 32), left: 115, top: top + 296 }, { input: label("128", 50, 32), left: 358, top: top + 220 },
    { input: label("64 square", 92, 32), left: 470, top: top + 202 }, { input: label("64 circle", 92, 32), left: 575, top: top + 202 },
  );
}
await sharp({ create: { width: 700, height: 1320, channels: 4, background: "#f7f3ea" } }).composite(board).png().toFile(path.join(out, "no-head-accessory-composition-qa.png"));
console.log(`Rendered no-head-accessory QA to ${out}`);
