import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const expressions = path.join(approval, "expressions", "png");
const output = path.join(approval, "mvp", "qa", "cream-knit-fixed-base");
const base = path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png");
const glasses = path.join(png, "accessories", "round-glasses.png");
const beret = path.join(png, "accessories", "beret.png");
const background = path.join(png, "backgrounds", "minimal-cream.png");
const FACE_OFFSET_Y = -108;

const expressionsToShow = ["gentle", "bright", "chic", "confident", "playful"];
const faceLayers = (expression) => [
  path.join(expressions, `eyes-${expression}.png`),
  path.join(expressions, `eyebrows-${expression}.png`),
  path.join(expressions, `mouth-${expression}.png`),
];
async function compose(expression, accessory) {
  const metadata = await sharp(base).metadata();
  const width = metadata.width;
  const height = metadata.height;
  const facePaths = faceLayers(expression);
  const scaledBackground = await sharp(background).resize(width, height).png().toBuffer();
  const scaledFaceLayers = await Promise.all(facePaths.map(async (input) => ({
    input: await sharp(input).resize(width, height).png().toBuffer(),
    left: 0,
    top: FACE_OFFSET_Y,
  })));
  const scaledAccessory = accessory ? {
    input: await sharp(accessory).resize(width, height).png().toBuffer(),
    ...(accessory === glasses ? { left: 0, top: FACE_OFFSET_Y } : {}),
  } : undefined;
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([{ input: scaledBackground }, { input: await sharp(base).png().toBuffer() }, ...scaledFaceLayers, ...(scaledAccessory ? [scaledAccessory] : [])])
    .png().toBuffer();
}
function label(text) {
  return Buffer.from(`<svg width="310" height="45" xmlns="http://www.w3.org/2000/svg"><text x="12" y="29" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#2b2522">${text}</text></svg>`);
}
await fs.mkdir(output, { recursive: true });
const entries = [
  ...expressionsToShow.map((expression) => [expression, expression, undefined]),
  ["gentle + round-glasses", "gentle", glasses],
  ["gentle + beret", "gentle", beret],
];
const cards = [];
for (const [name, expression, accessory] of entries) {
  const image = await compose(expression, accessory);
  await fs.writeFile(path.join(output, `${name.replaceAll(" + ", "-")}.png`), image);
  const preview = await sharp(image).resize(256, 256).png().toBuffer();
  cards.push({ name, preview });
}
const board = sharp({ create: { width: 1240, height: 640, channels: 4, background: "#f7f3ea" } });
const composite = [];
for (const [index, card] of cards.entries()) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  composite.push({ input: card.preview, left: 35 + col * 300, top: 55 + row * 300 });
  composite.push({ input: label(card.name), left: 25 + col * 300, top: 8 + row * 300 });
}
await board.composite(composite).png().toFile(path.join(output, "fixed-base-expression-accessory-qa.png"));
const gentle = await compose("gentle");
const sizes = {
  "256": await sharp(gentle).resize(256, 256).png().toBuffer(),
  "128": await sharp(gentle).resize(128, 128).png().toBuffer(),
  "64 square": await sharp(gentle).resize(64, 64).png().toBuffer(),
  "64 circle": await sharp(gentle).resize(64, 64).png().toBuffer(),
};
const circleMask = Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white"/></svg>');
sizes["64 circle"] = await sharp(sizes["64 circle"]).composite([{ input: circleMask, blend: "dest-in" }]).png().toBuffer();
const sizeBoard = await sharp({ create: { width: 700, height: 340, channels: 4, background: "#f7f3ea" } }).composite([
  { input: sizes["256"], left: 25, top: 50 }, { input: sizes["128"], left: 330, top: 95 },
  { input: sizes["64 square"], left: 500, top: 127 }, { input: sizes["64 circle"], left: 600, top: 127 },
  { input: label("256"), left: 22, top: 280 }, { input: label("128"), left: 320, top: 240 },
  { input: label("64 square"), left: 480, top: 210 }, { input: label("64 circle"), left: 580, top: 210 },
]).png().toBuffer();
await fs.writeFile(path.join(output, "fixed-base-size-previews.png"), sizeBoard);
console.log(`Rendered fixed-base expression and accessory QA: ${output}`);
