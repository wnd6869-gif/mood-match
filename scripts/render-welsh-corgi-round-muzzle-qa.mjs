import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const basePath = path.join(publicRoot, "animals/welsh-corgi/coral-hoodie/welsh-corgi-coral-hoodie-base.png");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle");
const mvpRoot = path.join(publicRoot, "approval/golden-retriever-v2/mvp/png");
const outputRoot = path.join(publicRoot, "animals/welsh-corgi/qa");
const preset = JSON.parse(await fs.readFile(path.join(publicRoot, "avatar-system/round-muzzle/v1/face-rigs/welsh-corgi.v1.json"), "utf8"));

const cases = [
  ["gentle", "minimal-cream"],
  ["bright", "green-park"],
  ["chic", "warm-cafe", true],
  ["confident", "warm-cafe"],
  ["playful", "minimal-cream", false, true],
];
const sizes = { eyes: [224, 100], eyebrows: [224, 60], mouth: [128, 70] };
const visualCenters = { eyes: [111.5, 49.5], eyebrows: [109.5, 24.5], mouth: [63.5, 29.5], glasses: [511.5, 413.5] };

function resolveTransform(expression, part) {
  const centerName = part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "mouthCenter";
  const center = preset.anchors[centerName];
  const layer = preset.layers[part];
  const override = preset.expressionTransformOverrides?.[expression]?.[part] ?? {};
  const [visualX, visualY] = visualCenters[part];
  const scaleX = layer.scaleX * (override.scaleX ?? 1);
  const scaleY = layer.scaleY * (override.scaleY ?? 1);
  return {
    x: center.x + layer.offsetX + (override.deltaX ?? 0) - visualX * scaleX,
    y: center.y + layer.offsetY + (override.deltaY ?? 0) - visualY * scaleY,
    scaleX,
    scaleY,
    rotation: (layer.rotation ?? 0) + (override.rotation ?? 0),
  };
}

async function materialize(expression, part, width, height, rotation) {
  const source = await fs.readFile(path.join(expressionRoot, expression, `${part}.svg`), "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "mouth";
  return sharp(Buffer.from(source.replaceAll(`var(--${variable}-color)`, preset.colors[part])))
    .resize(width, height)
    .rotate(rotation, { background: "#00000000" })
    .png()
    .toBuffer();
}

async function placeFullCanvas(input, width, height, x, y, scaleX, scaleY) {
  const layer = await sharp(input).resize(Math.round(width * scaleX), Math.round(height * scaleY)).png().toBuffer();
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([{ input: layer, left: Math.round(x), top: Math.round(y) }]).png().toBuffer();
}

await fs.mkdir(outputRoot, { recursive: true });
const metadata = await sharp(basePath).metadata();
const width = metadata.width;
const height = metadata.height;
const canvasScale = width / 1024;
const board = [];
const smallBoard = [];

for (const [index, [expression, background, hasGlasses, hasSparkles]] of cases.entries()) {
  const layers = [
    { input: await sharp(path.join(mvpRoot, "backgrounds", `${background}.png`)).resize(width, height).png().toBuffer() },
    { input: await sharp(basePath).png().toBuffer() },
  ];
  for (const part of Object.keys(sizes)) {
    const [naturalWidth, naturalHeight] = sizes[part];
    const transform = resolveTransform(expression, part);
    layers.push({
      input: await materialize(expression, part, Math.round(naturalWidth * transform.scaleX * canvasScale), Math.round(naturalHeight * transform.scaleY * canvasScale), transform.rotation),
      left: Math.round(transform.x * canvasScale),
      top: Math.round(transform.y * canvasScale),
    });
  }
  if (hasGlasses) {
    const glasses = preset.layers.glasses;
    const x = preset.anchors.eyeCenter.x + glasses.offsetX - visualCenters.glasses[0] * glasses.scaleX;
    const y = preset.anchors.eyeCenter.y + glasses.offsetY - visualCenters.glasses[1] * glasses.scaleY;
    layers.push({ input: await placeFullCanvas(path.join(mvpRoot, "accessories/round-glasses.png"), width, height, x * canvasScale, y * canvasScale, glasses.scaleX, glasses.scaleY) });
  }
  if (hasSparkles) layers.push({ input: await sharp(path.join(publicRoot, "foreground-effects/original/warm-sparkles-v1.png")).resize(width, height).png().toBuffer() });
  const image = await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(layers).png().toBuffer();
  await fs.writeFile(path.join(outputRoot, `${expression}.png`), image);
  smallBoard.push({ input: await sharp(image).resize(64, 64).png().toBuffer(), left: index * 64, top: 0 });
  board.push(
    { input: await sharp(image).resize(256, 256).png().toBuffer(), left: index * 256, top: 0 },
    { input: await sharp(image).resize(64, 64).png().toBuffer(), left: index * 256 + 96, top: 270 },
  );
}

await sharp({ create: { width: 1280, height: 340, channels: 4, background: "#f7f3ea" } }).composite(board).png().toFile(path.join(outputRoot, "welsh-corgi-round-muzzle-qa.png"));
await sharp({ create: { width: 320, height: 64, channels: 4, background: "#f7f3ea" } }).composite(smallBoard).png().toFile(path.join(outputRoot, "welsh-corgi-expression-64-qa.png"));
console.log(`Rendered Welsh Corgi QA at ${outputRoot}`);
