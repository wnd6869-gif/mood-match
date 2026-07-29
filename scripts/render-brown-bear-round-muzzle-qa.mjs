import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const basePath = path.join(publicRoot, "animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle");
const mvpRoot = path.join(publicRoot, "approval/golden-retriever-v2/mvp/png");
const outputRoot = path.join(publicRoot, "animals/brown-bear/qa");
const preset = JSON.parse(await fs.readFile(path.join(publicRoot, "avatar-system/round-muzzle/v1/face-rigs/brown-bear.v1.json"), "utf8"));

const cases = [
  ["gentle", "minimal-cream"],
  ["bright", "green-park"],
  ["chic", "warm-cafe", true],
  ["confident", "warm-cafe"],
  ["playful", "minimal-cream", false, true],
];
const sizes = { eyes: [224, 100], eyebrows: [224, 60], mouth: [128, 70] };
const visualCenters = { eyes: [111.5, 49.5], eyebrows: [109.5, 24.5], mouth: [63.5, 29.5] };

function resolveTransform(expression, part) {
  if (preset.coordinateSystem === "face-centers-v1") {
    const centerName = part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "mouthCenter";
    const center = preset.anchors[centerName];
    const layer = preset.layers[part];
    const override = preset.expressionTransformOverrides?.[expression]?.[part] ?? {};
    const [visualX, visualY] = visualCenters[part];
    const scaleX = layer.scaleX * (override.scaleX ?? 1);
    const scaleY = layer.scaleY * (override.scaleY ?? 1);
    return { x: center.x + layer.offsetX + (override.deltaX ?? 0) - visualX * scaleX, y: center.y + layer.offsetY + (override.deltaY ?? 0) - visualY * scaleY, scaleX, scaleY, rotation: (layer.rotation ?? 0) + (override.rotation ?? 0) };
  }
  const base = preset.anchors[part];
  const override = preset.expressionTransformOverrides?.[expression]?.[part] ?? {};
  return {
    x: base.x + (override.x ?? 0),
    y: base.y + (override.y ?? 0),
    scaleX: base.scaleX * (override.scaleX ?? 1),
    scaleY: base.scaleY * (override.scaleY ?? 1),
    rotation: base.rotation + (override.rotation ?? 0),
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

await fs.mkdir(outputRoot, { recursive: true });
const board = [];
const smallBoard = [];
const { width, height } = await sharp(basePath).metadata();
for (const [index, [expression, background, hasGlasses, hasSparkles]] of cases.entries()) {
  const layers = [
    { input: await sharp(path.join(mvpRoot, "backgrounds", `${background}.png`)).resize(width, height).png().toBuffer() },
    { input: await sharp(basePath).png().toBuffer() },
  ];
  for (const part of Object.keys(sizes)) {
    const [naturalWidth, naturalHeight] = sizes[part];
    const transform = resolveTransform(expression, part);
    layers.push({
      input: await materialize(expression, part, Math.round(naturalWidth * transform.scaleX), Math.round(naturalHeight * transform.scaleY), transform.rotation),
      left: Math.round(transform.x), top: Math.round(transform.y),
    });
  }
  if (hasGlasses) {
    const glasses = preset.coordinateSystem === "face-centers-v1"
      ? { x: preset.anchors.eyeCenter.x + preset.layers.glasses.offsetX - 511.5 * preset.layers.glasses.scaleX, y: preset.anchors.eyeCenter.y + preset.layers.glasses.offsetY - 413.5 * preset.layers.glasses.scaleY, scaleX: preset.layers.glasses.scaleX, scaleY: preset.layers.glasses.scaleY }
      : preset.anchors.glasses;
    layers.push({
      input: await fitLayerToCanvas(path.join(mvpRoot, "accessories/round-glasses.png"), Math.round(glasses.x), Math.round(glasses.y), Math.round(width * glasses.scaleX)),
    });
  }
  if (hasSparkles) layers.push({ input: await sharp(path.join(publicRoot, "foreground-effects/original/warm-sparkles-v1.png")).resize(width, height).png().toBuffer() });
  const image = await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(layers).png().toBuffer();
  await fs.writeFile(path.join(outputRoot, `${expression}.png`), image);
  smallBoard.push({ input: await sharp(image).resize(64, 64).png().toBuffer(), left: index * 64, top: 0 });
  board.push(
    { input: await sharp(image).resize(256).png().toBuffer(), left: index * 256, top: 0 },
    { input: await sharp(image).resize(64).png().toBuffer(), left: index * 256 + 96, top: 270 },
  );
}
await sharp({ create: { width: 1280, height: 340, channels: 4, background: "#f7f3ea" } }).composite(board).png().toFile(path.join(outputRoot, "brown-bear-round-muzzle-qa.png"));
await sharp({ create: { width: 320, height: 64, channels: 4, background: "#f7f3ea" } }).composite(smallBoard).png().toFile(path.join(outputRoot, "brown-bear-expression-64-qa.png"));
