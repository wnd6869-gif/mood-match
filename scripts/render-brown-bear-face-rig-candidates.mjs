import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const basePath = path.join(publicRoot, "animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle");
const mvpRoot = path.join(publicRoot, "approval/golden-retriever-v2/mvp/png");
const outputRoot = path.join(publicRoot, "animals/brown-bear/qa/face-rig-candidates");
const current = JSON.parse(await fs.readFile(path.join(publicRoot, "avatar-system/round-muzzle/v1/face-rigs/brown-bear.v1.json"), "utf8"));
const cases = [
  ["gentle", "minimal-cream"], ["bright", "green-park"], ["chic", "warm-cafe", true],
  ["confident", "warm-cafe"], ["playful", "minimal-cream", false, true],
];
const partSizes = { eyes: [224, 100], eyebrows: [224, 60], mouth: [128, 70] };
const clone = (value) => structuredClone(value);

// A preserves the active preset. B tightens the eye-to-nose and nose-to-mouth
// relationships. C keeps B's face and only fits the existing glasses asset.
const compact = clone(current);
compact.anchors.eyes.y += 8;
compact.anchors.eyebrows.y += 8;
compact.anchors.mouth.y -= 12;
const glassesFit = clone(compact);
glassesFit.anchors.glasses = { x: -61, y: -180, scaleX: 1.12, scaleY: 1.12, rotation: 0 };
const candidates = [
  { id: "A-current", rig: current },
  { id: "B-compact-face", rig: compact },
  { id: "C-glasses-fit", rig: glassesFit },
];

function transform(rig, expression, part) {
  const base = rig.anchors[part];
  const override = rig.expressionTransformOverrides?.[expression]?.[part] ?? {};
  return { x: base.x + (override.x ?? 0), y: base.y + (override.y ?? 0), scaleX: base.scaleX * (override.scaleX ?? 1), scaleY: base.scaleY * (override.scaleY ?? 1), rotation: base.rotation + (override.rotation ?? 0) };
}
async function expressionLayer(expression, part, rig) {
  const source = await fs.readFile(path.join(expressionRoot, expression, `${part}.svg`), "utf8");
  const colorName = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "mouth";
  const [naturalWidth, naturalHeight] = partSizes[part];
  const value = transform(rig, expression, part);
  return { input: await sharp(Buffer.from(source.replaceAll(`var(--${colorName}-color)`, rig.colors[part]))).resize(Math.round(naturalWidth * value.scaleX), Math.round(naturalHeight * value.scaleY)).rotate(value.rotation, { background: "#00000000" }).png().toBuffer(), left: Math.round(value.x), top: Math.round(value.y) };
}
async function glassesLayer(rig) {
  const value = rig.anchors.glasses;
  const size = Math.round(1024 * value.scaleX);
  const left = Math.round(value.x);
  const top = Math.round(value.y);
  const cropLeft = Math.max(0, -left);
  const cropTop = Math.max(0, -top);
  const width = Math.min(size - cropLeft, 1024 - Math.max(left, 0));
  const height = Math.min(size - cropTop, 1024 - Math.max(top, 0));
  return {
    input: await sharp(path.join(mvpRoot, "accessories/round-glasses.png")).resize(size, size).extract({ left: cropLeft, top: cropTop, width, height }).png().toBuffer(),
    left: Math.max(0, left),
    top: Math.max(0, top),
  };
}
async function render(rig, expression, background, hasGlasses = false, hasSparkles = false) {
  const layers = [
    { input: await sharp(path.join(mvpRoot, "backgrounds", `${background}.png`)).resize(1024, 1024).png().toBuffer() },
    { input: await sharp(basePath).png().toBuffer() },
  ];
  for (const part of Object.keys(partSizes)) layers.push(await expressionLayer(expression, part, rig));
  if (hasGlasses) layers.push(await glassesLayer(rig));
  if (hasSparkles) layers.push({ input: await sharp(path.join(publicRoot, "foreground-effects/original/warm-sparkles-v1.png")).resize(1024, 1024).png().toBuffer() });
  return sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } }).composite(layers).png().toBuffer();
}
const label = (text, width, height, size = 26) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="12" y="${size + 4}" font-family="Arial, sans-serif" font-size="${size}" font-weight="700" fill="#3d3026">${text}</text></svg>`);

await fs.mkdir(outputRoot, { recursive: true });
const rows = [];
const delta = {};
for (const candidate of candidates) {
  const images = await Promise.all(cases.map(([expression, background, hasGlasses, hasSparkles]) => render(candidate.rig, expression, background, hasGlasses, hasSparkles)));
  const rowLayers = [{ input: label(candidate.id, 1600, 44), left: 0, top: 0 }];
  for (const [index, image] of images.entries()) {
    rowLayers.push({ input: await sharp(image).resize(256, 256).png().toBuffer(), left: index * 256, top: 44 });
    rowLayers.push({ input: await sharp(image).resize(64, 64).png().toBuffer(), left: index * 256 + 96, top: 310 });
  }
  const chic = images[2];
  rowLayers.push({ input: await sharp(chic).resize(512, 512).png().toBuffer(), left: 1280, top: 44 });
  const row = await sharp({ create: { width: 1792, height: 566, channels: 4, background: "#f7f3ea" } }).composite(rowLayers).png().toBuffer();
  rows.push({ input: row, left: 0, top: rows.length * 566 });
  delta[candidate.id] = candidate.rig.anchors;
}
await sharp({ create: { width: 1792, height: 1698, channels: 4, background: "#f7f3ea" } }).composite(rows).png().toFile(path.join(outputRoot, "brown-bear-face-rig-candidates.png"));
await fs.writeFile(path.join(outputRoot, "brown-bear-face-rig-candidate-deltas.json"), `${JSON.stringify({ current: current.anchors, candidates: delta }, null, 2)}\n`);
console.log(JSON.stringify({ qa: path.join(outputRoot, "brown-bear-face-rig-candidates.png"), deltas: path.join(outputRoot, "brown-bear-face-rig-candidate-deltas.json") }, null, 2));
