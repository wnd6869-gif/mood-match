import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const systemRoot = path.join(publicRoot, "avatar-system/round-muzzle/v1/face-rigs");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle");
const mvpRoot = path.join(publicRoot, "approval/golden-retriever-v2/mvp/png");
const cases = [
  ["golden-retriever.v1.json", "golden-retriever", "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-cream-knit-base.png"],
  ["otter.v1.json", "otter", "/character-assets/animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png"],
];
const partSizes = { eyes: [224, 100], eyebrows: [224, 60], mouth: [128, 70] };
const visualCenters = { eyes: [111.5, 49.5], eyebrows: [109.5, 24.5], mouth: [63.5, 29.5] };
const expressions = ["gentle", "bright", "chic", "confident", "playful"];
const rendered = [];

async function materialize(expression, part, colors, width, height, rotation) {
  const source = await fs.readFile(path.join(expressionRoot, expression, `${part}.svg`), "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "mouth";
  return sharp(Buffer.from(source.replaceAll(`var(--${variable}-color)`, colors[part])))
    .resize(width, height).rotate(rotation, { background: "#00000000" }).png().toBuffer();
}

function resolveTransform(preset, expression, part) {
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

for (const [presetFile, label, baseSource] of cases) {
  const preset = JSON.parse(await fs.readFile(path.join(systemRoot, presetFile), "utf8"));
  const basePath = path.join(root, "public", baseSource.replace(/^\//, ""));
  const { width, height } = await sharp(basePath).metadata();
  const scale = width / 1024;
  const layers = [
    { input: await sharp(path.join(mvpRoot, "backgrounds/minimal-cream.png")).resize(width, height).png().toBuffer() },
    { input: await sharp(basePath).png().toBuffer() },
  ];
  for (const expression of expressions) {
    const expressionLayers = [...layers];
    for (const [part, [partWidth, partHeight]] of Object.entries(partSizes)) {
      const anchor = resolveTransform(preset, expression, part);
      expressionLayers.push({
        input: await materialize(expression, part, preset.colors, Math.round(partWidth * anchor.scaleX * scale), Math.round(partHeight * anchor.scaleY * scale), anchor.rotation),
        left: Math.round(anchor.x * scale),
        top: Math.round(anchor.y * scale),
      });
    }
    const result = await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(expressionLayers).png().toBuffer();
    const output = path.join(publicRoot, "avatar-system/round-muzzle/v1/qa", `${label}-preset-${expression}.png`);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await sharp(result).resize(512).png().toFile(output);
    rendered.push({ output, label, expression });
    console.log(output);
  }
}

const qaWidth = 5 * 512;
const qaHeight = 2 * 552;
const labelSvg = (text, x, y) => Buffer.from(`<svg width="${qaWidth}" height="${qaHeight}" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" fill="#3d3026" font-size="24" font-family="Arial, sans-serif" text-anchor="middle">${text}</text></svg>`);
const qaLayers = [];
for (const [index, item] of rendered.entries()) {
  const col = index % 5;
  const row = Math.floor(index / 5);
  const x = col * 512;
  const y = row * 552;
  qaLayers.push({ input: await fs.readFile(item.output), left: x, top: y });
  qaLayers.push({ input: labelSvg(`${item.label} · ${item.expression}`, x + 256, y + 536), left: 0, top: 0 });
}
const comparisonOutput = path.join(publicRoot, "avatar-system/round-muzzle/v1/qa", "golden-otter-preset-expression-comparison.png");
await sharp({ create: { width: qaWidth, height: qaHeight, channels: 4, background: "#fffaf0" } }).composite(qaLayers).png().toFile(comparisonOutput);
console.log(comparisonOutput);
