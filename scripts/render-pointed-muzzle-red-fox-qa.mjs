import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const animal = process.argv[2] === "border-collie" ? "border-collie" : "red-fox";
const setup = animal === "border-collie"
  ? { base: "animals/border-collie/charcoal-jacket/border-collie.charcoal-jacket-base.png", rig: "border-collie.charcoal-jacket.v1.json", out: "animals/border-collie/qa", stem: "border-collie" }
  : { base: "animals/red-fox/olive-hoodie/red-fox.olive-hoodie-base.png", rig: "red-fox.olive-hoodie.v1.json", out: "animals/red-fox/qa", stem: "red-fox" };
const assets = path.join(root, "public/character-assets");
const family = path.join(assets, "avatar-system/pointed-muzzle/v1");
const base = path.join(assets, setup.base);
const out = path.join(assets, setup.out);
const backgrounds = path.join(assets, "approval/golden-retriever-v2/mvp/png/backgrounds");
const rig = JSON.parse(await fs.readFile(path.join(family, "face-rigs", setup.rig), "utf8"));
const cases = [["gentle", "minimal-cream"], ["bright", "green-park"], ["chic", "warm-cafe", true], ["confident", "warm-cafe"], ["playful", "minimal-cream", false, true]];
const parts = { eyes: { w: 240, h: 90, c: [120, 47] }, eyebrows: { w: 220, h: 50, c: [110, 25] }, snoutMark: { w: 100, h: 72, c: [50, 24] } };
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const centerFor = (part) => rig.anchors[part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "snoutMark"];
function placement(expression, part) {
  const spec = parts[part], layer = rig.layers[part], delta = rig.expressionTransformOverrides?.[expression]?.[part] ?? {};
  const scaleX = layer.scaleX * (delta.scaleX ?? 1), scaleY = layer.scaleY * (delta.scaleY ?? 1), center = centerFor(part);
  return { x: center.x + layer.offsetX + (delta.deltaX ?? 0) - spec.c[0] * scaleX, y: center.y + layer.offsetY + (delta.deltaY ?? 0) - spec.c[1] * scaleY, scaleX, scaleY, rotation: (layer.rotation ?? 0) + (delta.rotation ?? 0) };
}
async function partSvg(expression, part, p) {
  const assetPart = part === "snoutMark" ? "snout-mark" : part;
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "snout-mark";
  const svg = await fs.readFile(path.join(family, "expressions", expression, `${assetPart}.svg`), "utf8");
  return sharp(Buffer.from(svg.replaceAll(`var(--${variable}-color)`, rig.colors[part]))).resize(Math.round(parts[part].w * p.scaleX), Math.round(parts[part].h * p.scaleY)).rotate(p.rotation, { background: "#00000000" }).png().toBuffer();
}
async function render(expression, background, glasses = false, sparkles = false) {
  const layers = [{ input: await sharp(path.join(backgrounds, `${background}.png`)).resize(1024).png().toBuffer() }, { input: await sharp(base).png().toBuffer() }];
  for (const part of Object.keys(parts).filter((part) => !rig.disabledLayers?.includes(part))) { const p = placement(expression, part); layers.push({ input: await partSvg(expression, part, p), left: Math.round(p.x), top: Math.round(p.y) }); }
  if (glasses) { const g = rig.layers.glasses; layers.push({ input: await sharp(path.join(family, "accessories/round-glasses.svg")).resize(Math.round(280 * g.scaleX), Math.round(110 * g.scaleY)).png().toBuffer(), left: Math.round(rig.anchors.eyeCenter.x + g.offsetX - 140 * g.scaleX), top: Math.round(rig.anchors.eyeCenter.y + g.offsetY - 55 * g.scaleY) }); }
  if (sparkles) layers.push({ input: await sharp(path.join(assets, "foreground-effects/original/warm-sparkles-v1.png")).resize(1024).png().toBuffer() });
  return sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } }).composite(layers).png().toBuffer();
}
async function circle(input) { return sharp(input).resize(64).composite([{ input: Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32" fill="white"/></svg>'), blend: "dest-in" }]).png().toBuffer(); }

await fs.mkdir(out, { recursive: true });
const board = [], report = { rig, sharedExpressionAssets: {}, cases: [] };
for (const [index, [expression, background, glasses, sparkles]] of cases.entries()) {
  const full = await render(expression, background, glasses, sparkles);
  const sizes = { "256": await sharp(full).resize(256).png().toBuffer(), "128": await sharp(full).resize(128).png().toBuffer(), "64-square": await sharp(full).resize(64).png().toBuffer(), "64-circle": await circle(full) };
  await Promise.all(Object.entries(sizes).map(([name, image]) => fs.writeFile(path.join(out, `${expression}-${name}.png`), image)));
  board.push({ input: sizes["256"], left: index * 256, top: 0 }, { input: sizes["128"], left: index * 256 + 64, top: 266 }, { input: sizes["64-square"], left: index * 256 + 48, top: 404 }, { input: sizes["64-circle"], left: index * 256 + 144, top: 404 });
  report.cases.push({ expression, background, glasses: Boolean(glasses), sparkles: Boolean(sparkles) });
  for (const part of Object.keys(parts)) { const assetPart = part === "snoutMark" ? "snout-mark" : part, file = path.join(family, "expressions", expression, `${assetPart}.svg`); report.sharedExpressionAssets[path.relative(root, file).replaceAll("\\", "/")] = sha(await fs.readFile(file)); }
}
await sharp({ create: { width: 1280, height: 480, channels: 4, background: "#f7f3ea" } }).composite(board).png().toFile(path.join(out, `${setup.stem}-pointed-muzzle-v1-qa.png`));
await sharp(await render("chic", "warm-cafe", true)).resize(512).png().toFile(path.join(out, `${setup.stem}-chic-glasses-512.png`));
await fs.writeFile(path.join(out, `${setup.stem}-pointed-muzzle-v1-qa.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ out, rig, sharedExpressionAssets: report.sharedExpressionAssets }, null, 2));
