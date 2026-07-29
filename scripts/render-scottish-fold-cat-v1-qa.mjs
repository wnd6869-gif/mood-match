import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public/character-assets");
const catRoot = path.join(assets, "avatar-system/cat/v1");
const basePath = path.join(assets, "animals/scottish-fold/olive-knit/scottish-fold-olive-knit-base.png");
const outputRoot = path.join(assets, "animals/scottish-fold/qa");
const backgrounds = path.join(assets, "approval/golden-retriever-v2/mvp/png/backgrounds");
const rig = JSON.parse(await fs.readFile(path.join(catRoot, "face-rigs/scottish-fold.olive-knit.v1.json"), "utf8"));
const cases = [["gentle", "minimal-cream"], ["bright", "green-park"], ["chic", "warm-cafe", true], ["confident", "warm-cafe"], ["playful", "minimal-cream", false, true]];
const parts = { eyes: { width: 240, height: 90, center: [120, 47] }, eyebrows: { width: 220, height: 50, center: [110, 25] }, noseMouth: { width: 140, height: 100, center: [70, 29] } };
const glasses = { width: 280, height: 110, center: [140, 55] };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function placement(expression, part) {
  const anchor = rig.anchors[part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "noseCenter"];
  const layer = rig.layers[part], delta = rig.expressionTransformOverrides?.[expression]?.[part] ?? {}, spec = parts[part];
  const scaleX = layer.scaleX * (delta.scaleX ?? 1), scaleY = layer.scaleY * (delta.scaleY ?? 1);
  return { x: anchor.x + layer.offsetX + (delta.deltaX ?? 0) - spec.center[0] * scaleX, y: anchor.y + layer.offsetY + (delta.deltaY ?? 0) - spec.center[1] * scaleY, scaleX, scaleY, rotation: (layer.rotation ?? 0) + (delta.rotation ?? 0) };
}
async function expressionLayer(expression, part, width, height, rotation) {
  const assetPart = part === "noseMouth" ? "nose-mouth" : part;
  const source = await fs.readFile(path.join(catRoot, "expressions", expression, `${assetPart}.svg`), "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "nose-mouth";
  return sharp(Buffer.from(source.replaceAll(`var(--${variable}-color)`, rig.colors[part]))).resize(width, height).rotate(rotation, { background: "#00000000" }).png().toBuffer();
}
async function render(expression, background, hasGlasses, hasSparkles) {
  const layers = [{ input: await sharp(path.join(backgrounds, `${background}.png`)).resize(1024, 1024).png().toBuffer() }, { input: await sharp(basePath).png().toBuffer() }];
  for (const part of Object.keys(parts)) {
    const spec = parts[part], item = placement(expression, part);
    layers.push({ input: await expressionLayer(expression, part, Math.round(spec.width * item.scaleX), Math.round(spec.height * item.scaleY), item.rotation), left: Math.round(item.x), top: Math.round(item.y) });
  }
  if (hasGlasses) { const item = rig.layers.glasses, x = rig.anchors.eyeCenter.x + item.offsetX - glasses.center[0] * item.scaleX, y = rig.anchors.eyeCenter.y + item.offsetY - glasses.center[1] * item.scaleY; layers.push({ input: await sharp(path.join(catRoot, "accessories/round-glasses.svg")).resize(Math.round(glasses.width * item.scaleX), Math.round(glasses.height * item.scaleY)).png().toBuffer(), left: Math.round(x), top: Math.round(y) }); }
  if (hasSparkles) layers.push({ input: await sharp(path.join(assets, "foreground-effects/original/warm-sparkles-v1.png")).resize(1024, 1024).png().toBuffer() });
  return sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } }).composite(layers).png().toBuffer();
}
async function circle(image) { const mask = Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32" fill="white"/></svg>'); return sharp(image).resize(64, 64).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer(); }

await fs.mkdir(outputRoot, { recursive: true });
const board = [], debug = [], report = { rig, assets: {}, cases: [] };
for (const [index, [expression, background, hasGlasses, hasSparkles]] of cases.entries()) {
  const image = await render(expression, background, hasGlasses, hasSparkles);
  const images = { "256": await sharp(image).resize(256, 256).png().toBuffer(), "128": await sharp(image).resize(128, 128).png().toBuffer(), "64-square": await sharp(image).resize(64, 64).png().toBuffer(), "64-circle": await circle(image) };
  await Promise.all(Object.entries(images).map(([size, image]) => fs.writeFile(path.join(outputRoot, `${expression}-${size}.png`), image)));
  board.push({ input: images["256"], left: index * 256, top: 0 }, { input: images["128"], left: index * 256 + 64, top: 266 }, { input: images["64-square"], left: index * 256 + 48, top: 404 }, { input: images["64-circle"], left: index * 256 + 144, top: 404 });
  report.cases.push({ expression, background, glasses: Boolean(hasGlasses), sparkles: Boolean(hasSparkles) });
  for (const [row, part] of Object.keys(parts).entries()) { const spec = parts[part], item = placement(expression, part), image = await expressionLayer(expression, part, Math.round(spec.width * item.scaleX), Math.round(spec.height * item.scaleY), item.rotation), metadata = await sharp(image).metadata(); debug.push({ input: image, left: Math.round(index * 256 + (256 - metadata.width) / 2), top: row * 120 }); }
}
await sharp({ create: { width: 1280, height: 480, channels: 4, background: "#f7f3ea" } }).composite(board).png().toFile(path.join(outputRoot, "scottish-fold-cat-v1-qa.png"));
await sharp({ create: { width: 1280, height: 360, channels: 4, background: "#f7f3ea" } }).composite(debug).png().toFile(path.join(outputRoot, "scottish-fold-cat-v1-parts-qa.png"));
const chic = await render("chic", "warm-cafe", true, false); await sharp(chic).resize(512, 512).png().toFile(path.join(outputRoot, "scottish-fold-chic-glasses-512.png"));
for (const [expression] of cases) for (const part of Object.keys(parts)) { const assetPart = part === "noseMouth" ? "nose-mouth" : part; const file = path.join(catRoot, "expressions", expression, `${assetPart}.svg`); report.assets[path.relative(root, file).replaceAll("\\", "/")] = sha256(await fs.readFile(file)); }
report.assets[path.relative(root, path.join(catRoot, "accessories/round-glasses.svg")).replaceAll("\\", "/")] = sha256(await fs.readFile(path.join(catRoot, "accessories/round-glasses.svg")));
await fs.writeFile(path.join(outputRoot, "scottish-fold-cat-v1-qa.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputRoot, faceRig: "scottish-fold.olive-knit.v1.json", qa: "scottish-fold-cat-v1-qa.png" }, null, 2));
