import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const expressions = path.join(approval, "expressions", "png");
const out = path.join(approval, "mvp", "qa", "coral-hoodie-fixed-base");
const creamBase = path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png");
const coralBase = path.join(png, "fixed-bases", "golden-retriever-coral-hoodie-base.png");
const glasses = path.join(png, "accessories", "round-glasses.png");
const backgrounds = {
  minimalCream: path.join(png, "backgrounds", "minimal-cream.png"),
  greenPark: path.join(png, "backgrounds", "green-park.png"),
  warmCafe: path.join(png, "backgrounds", "warm-cafe.png"),
};
const warmSparkles = path.join(root, "public", "character-assets", "foreground-effects", "original", "warm-sparkles-v1.png");
const FACE_OFFSET_Y = -108;
const cases = [
  ["gentle-minimal", "gentle · minimal cream", "gentle", backgrounds.minimalCream],
  ["bright-park", "bright · green park", "bright", backgrounds.greenPark],
  ["chic-glasses-cafe", "chic · round glasses · warm cafe", "chic", backgrounds.warmCafe, glasses],
  ["playful-sparkles", "playful · warm sparkles · minimal cream", "playful", backgrounds.minimalCream, undefined, warmSparkles],
];

const label = (value, width = 340, height = 34) => Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="6" y="23" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#2b2522">${value}</text></svg>`,
);
const circle = Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white"/></svg>');

async function compose(base, expression, background, faceAccessory, foregroundEffect) {
  const { width, height } = await sharp(base).metadata();
  const face = await Promise.all(["eyes", "eyebrows", "mouth"].map(async (part) => ({
    input: await sharp(path.join(expressions, `${part}-${expression}.png`)).resize(width, height).png().toBuffer(),
    left: 0,
    top: FACE_OFFSET_Y,
  })));
  const accessory = faceAccessory ? [{
    input: await sharp(faceAccessory).resize(width, height).png().toBuffer(),
    left: 0,
    top: FACE_OFFSET_Y,
  }] : [];
  const effect = foregroundEffect ? [{ input: await sharp(foregroundEffect).resize(width, height).png().toBuffer() }] : [];
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([
      { input: await sharp(background).resize(width, height).png().toBuffer() },
      { input: await sharp(base).png().toBuffer() },
      ...face,
      ...accessory,
      ...effect,
    ])
    .png()
    .toBuffer();
}

await fs.mkdir(out, { recursive: true });
const boardParts = [];
for (const [index, [slug, title, expression, background, accessory, effect]] of cases.entries()) {
  const composed = await compose(coralBase, expression, background, accessory, effect);
  await fs.writeFile(path.join(out, `${slug}.png`), composed);
  const [p256, p128, p64] = await Promise.all([
    sharp(composed).resize(256, 256).png().toBuffer(),
    sharp(composed).resize(128, 128).png().toBuffer(),
    sharp(composed).resize(64, 64).png().toBuffer(),
  ]);
  const pCircle = await sharp(p64).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
  const top = 20 + index * 310;
  boardParts.push(
    { input: label(title), left: 20, top },
    { input: p256, left: 20, top: top + 34 },
    { input: p128, left: 312, top: top + 86 },
    { input: p64, left: 478, top: top + 118 },
    { input: pCircle, left: 578, top: top + 118 },
    { input: label("256", 44, 28), left: 118, top: top + 290 },
    { input: label("128", 44, 28), left: 350, top: top + 220 },
    { input: label("64 square", 88, 28), left: 468, top: top + 202 },
    { input: label("64 circle", 88, 28), left: 572, top: top + 202 },
  );
}
await sharp({ create: { width: 700, height: 1260, channels: 4, background: "#f7f3ea" } })
  .composite(boardParts)
  .png()
  .toFile(path.join(out, "coral-hoodie-composition-qa.png"));

const [creamGentle, coralGentle] = await Promise.all([
  compose(creamBase, "gentle", backgrounds.minimalCream),
  compose(coralBase, "gentle", backgrounds.minimalCream),
]);
const sideBySide = await sharp({ create: { width: 1024, height: 512, channels: 4, background: "#f7f3ea" } })
  .composite([
    { input: await sharp(creamGentle).resize(512, 512).png().toBuffer(), left: 0, top: 0 },
    { input: await sharp(coralGentle).resize(512, 512).png().toBuffer(), left: 512, top: 0 },
  ]).png().toBuffer();
await fs.writeFile(path.join(out, "cream-knit-vs-coral-hoodie-gentle.png"), sideBySide);

const { width, height } = await sharp(coralBase).metadata();
const overlay = await sharp(creamGentle).composite([{ input: coralGentle, blend: "over", opacity: 0.5 }]).png().toBuffer();
await fs.writeFile(path.join(out, "cream-coral-50-percent-overlay.png"), overlay);
await sharp(coralBase)
  .resize(512, 512)
  .png()
  .toFile(path.join(out, "coral-hoodie-base-transparent-preview.png"));
await sharp(coralGentle)
  .extract({ left: Math.round(width * 0.27), top: Math.round(height * 0.17), width: Math.round(width * 0.46), height: Math.round(height * 0.42) })
  .resize(512, 512)
  .png()
  .toFile(path.join(out, "coral-hoodie-gentle-anchor-alignment.png"));

console.log(`Rendered coral hoodie fixed-base QA to ${out}`);
