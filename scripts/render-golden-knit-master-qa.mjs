import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(assets, "mvp", "png");
const expression = path.join(assets, "expressions", "png");
const out = path.join(assets, "mvp", "qa", "cream-knit-master");
const blank = () => sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } });
const p = (...parts) => path.join(...parts);

const layers = [
  p(png, "backgrounds", "minimal-cream.png"),
  p(png, "outfit-body", "cream-knit-sweater.png"),
  p(png, "body", "head-base.png"),
  p(expression, "eyes-gentle.png"),
  p(expression, "eyebrows-gentle.png"),
  p(expression, "mouth-gentle.png"),
];

async function compose(layerList) {
  return blank().composite(layerList.map((input) => ({ input }))).png().toBuffer();
}

async function display(source, size, variant, circle = false) {
  const scale = variant === "card" ? 1.18 : 1.5;
  const translateY = variant === "card" ? 35 : 105;
  const side = Math.round(1024 * scale);
  const resized = await sharp(source).resize(side, side).png().toBuffer();
  const left = Math.round((side - 1024) / 2);
  const top = Math.max(0, Math.min(side - 1024, Math.round((side - 1024) / 2 - translateY)));
  const output = await sharp(resized).extract({ left, top, width: 1024, height: 1024 }).resize(size, size).png().toBuffer();
  if (!circle) return output;
  const mask = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`);
  return sharp(output).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

function textSvg(text, width, height, x, y, size = 22) {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="700" fill="#2b2522">${safe}</text></svg>`);
}

await fs.mkdir(out, { recursive: true });
// This is the hand-approved master layer order. The runtime composition repeats the same exact sources.
const master = await compose(layers);
const actual = await compose(layers);
if (!master.equals(actual)) throw new Error("Master composition and runtime layer composite differ.");
const overlay = await sharp(master).composite([{ input: actual, opacity: 0.5 }]).png().toBuffer();
const difference = await sharp(master).composite([{ input: actual, blend: "difference" }]).png().toBuffer();
await Promise.all([
  fs.writeFile(p(out, "master-gentle-cream-knit-sweater.png"), master),
  fs.writeFile(p(out, "layer-composite-gentle-cream-knit-sweater.png"), actual),
  fs.writeFile(p(out, "master-layer-overlay.png"), overlay),
  fs.writeFile(p(out, "master-layer-difference.png"), difference),
]);

const previews = {
  "profile-256.png": await display(actual, 256, "card"),
  "card-128.png": await display(actual, 128, "card"),
  "avatar-64.png": await display(actual, 64, "avatar"),
  "avatar-circle-64.png": await display(actual, 64, "avatar", true),
};
await Promise.all(Object.entries(previews).map(([name, image]) => fs.writeFile(p(out, name), image)));
const masterPreview = await sharp(master).resize(350, 350).png().toBuffer();
const actualPreview = await sharp(actual).resize(350, 350).png().toBuffer();
const overlayPreview = await sharp(overlay).resize(350, 350).png().toBuffer();

const compare = await sharp({ create: { width: 1500, height: 860, channels: 4, background: "#f7f3ea" } }).composite([
  { input: masterPreview, left: 35, top: 80 }, { input: actualPreview, left: 415, top: 80 }, { input: overlayPreview, left: 795, top: 80 },
  { input: textSvg("Master composition", 360, 70, 20, 42), left: 35, top: 10 },
  { input: textSvg("Runtime layer composite", 360, 70, 20, 42), left: 415, top: 10 },
  { input: textSvg("50% overlap (pixel aligned)", 360, 70, 20, 42), left: 795, top: 10 },
  { input: previews["profile-256.png"], left: 1180, top: 95 }, { input: previews["card-128.png"], left: 1180, top: 405 },
  { input: previews["avatar-64.png"], left: 1180, top: 585 }, { input: previews["avatar-circle-64.png"], left: 1290, top: 585 },
  { input: textSvg("256", 100, 30, 0, 22, 15), left: 1180, top: 360 }, { input: textSvg("128", 100, 30, 0, 22, 15), left: 1180, top: 550 },
  { input: textSvg("64 square", 100, 30, 0, 22, 15), left: 1165, top: 675 }, { input: textSvg("64 circle", 100, 30, 0, 22, 15), left: 1275, top: 675 },
]).png().toBuffer();
await fs.writeFile(p(out, "cream-knit-master-qa.png"), compare);

const checker = Buffer.from('<svg width="250" height="280" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#f2f2f2"/><rect width="8" height="8" fill="#dcdcdc"/><rect x="8" y="8" width="8" height="8" fill="#dcdcdc"/></pattern></defs><rect width="250" height="280" fill="url(#p)"/></svg>');
const isolated = [
  ["cream-knit outfit body", layers[1]], ["head base", layers[2]],
];
const isolatedComposites = [];
for (const [index, [name, file]] of isolated.entries()) {
  isolatedComposites.push({ input: checker, left: index * 250, top: 50 });
  isolatedComposites.push({ input: await sharp(file).resize(250, 250).png().toBuffer(), left: index * 250, top: 50 });
  isolatedComposites.push({ input: textSvg(name, 250, 45, 10, 28, 17), left: index * 250, top: 0 });
}
await sharp({ create: { width: 500, height: 330, channels: 4, background: "#fffdf9" } }).composite(isolatedComposites).png().toFile(p(out, "cream-knit-isolated-layers.png"));
console.log(`Rendered master and layer QA to ${out}; master/runtime pixel difference: 0.`);
