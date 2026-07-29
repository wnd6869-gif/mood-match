import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const basePath = path.join(publicRoot, "animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png");
const mvpRoot = path.join(publicRoot, "approval/golden-retriever-v2/mvp/png");
const output = path.join(publicRoot, "animals/brown-bear/qa/brown-bear-glasses-alignment.png");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle/chic");
const colors = { eyes: "#2b1a13", eyebrows: "#3c2015", mouth: "#542a1d" };

async function fitLayerToCanvas(input, x, y, size) {
  const cropLeft = Math.max(0, -x);
  const cropTop = Math.max(0, -y);
  const targetLeft = Math.max(0, x);
  const targetTop = Math.max(0, y);
  const cropWidth = Math.min(size - cropLeft, 1024 - targetLeft);
  const cropHeight = Math.min(size - cropTop, 1024 - targetTop);
  const cropped = await sharp(input).resize(size, size).extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight }).png().toBuffer();
  return sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } })
    .composite([{ input: cropped, left: targetLeft, top: targetTop }]).png().toBuffer();
}

async function layer(part, x, y, width, height) {
  const source = await fs.readFile(path.join(expressionRoot, `${part}.svg`), "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "mouth";
  return {
    input: await sharp(Buffer.from(source.replaceAll(`var(--${variable}-color)`, colors[part]))).resize(width, height).png().toBuffer(),
    left: x,
    top: y,
  };
}

const [eyes, eyebrows, mouth] = await Promise.all([
  layer("eyes", 416, 234, 192, 86),
  layer("eyebrows", 416, 194, 190, 52),
  layer("mouth", 460, 368, 108, 58),
]);
const glasses = {
  input: await fitLayerToCanvas(path.join(mvpRoot, "accessories/round-glasses.png"), -10, -145, 1044),
};
const image = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } })
  .composite([
    { input: await sharp(path.join(mvpRoot, "backgrounds/warm-cafe.png")).png().toBuffer() },
    { input: await sharp(basePath).png().toBuffer() },
    eyes, eyebrows, mouth, glasses,
  ])
  .png()
  .toBuffer();
await sharp(image).resize(512).png().toFile(output);
