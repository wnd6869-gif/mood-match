import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const mvp = path.join(assets, "mvp", "png");
const output = path.join(assets, "mvp", "qa", "body-redesign");
const expressionRoot = path.join(assets, "expressions", "png");

const combinations = [
  ["01-gentle-cream-knit-sweater-minimal-cream", "gentle · cream knit sweater · minimal cream", "gentle", "cream-knit-sweater", "minimal-cream"],
  ["02-bright-coral-hoodie-green-park", "bright · coral hoodie · green park", "bright", "coral-hoodie", "green-park"],
  ["03-chic-navy-shirt-glasses-warm-cafe", "chic · navy shirt · round glasses · warm cafe", "chic", "navy-shirt", "warm-cafe", "round-glasses"],
  ["04-confident-navy-shirt-beret-book-warm-cafe", "confident · navy shirt · beret · book · warm cafe", "confident", "navy-shirt", "warm-cafe", undefined, "beret", "book"],
];

const input = (...parts) => path.join(...parts);
const transparent = () => sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } });

function layerPaths([, , expression, outfit, background, glasses, beret, prop]) {
  return [
    input(mvp, "backgrounds", `${background}.png`),
    input(mvp, "body", "body-under-outfit.png"),
    input(mvp, "outfits", `${outfit}.png`),
    prop ? input(mvp, "props", `${prop}-behind-paw.png`) : undefined,
    input(mvp, "body", "head-base.png"),
    input(expressionRoot, `eyes-${expression}.png`),
    input(expressionRoot, `eyebrows-${expression}.png`),
    input(expressionRoot, `mouth-${expression}.png`),
    glasses ? input(mvp, "accessories", "round-glasses.png") : undefined,
    beret ? input(mvp, "accessories", "beret.png") : undefined,
    ...(prop === "book"
      ? [input(mvp, "props", "paw-front-left-book.png"), input(mvp, "props", "paw-front-right-book.png")]
      : prop === "coffee" ? [input(mvp, "body", "front-paw-left.png"), input(mvp, "props", "paw-front-coffee.png")]
      : [input(mvp, "body", "front-paw-left.png"), input(mvp, "body", "front-paw-right.png")]),
  ].filter(Boolean);
}

async function compose(layers) {
  return transparent().composite(layers.map((file) => ({ input: file }))).png().toBuffer();
}

async function crop(source, size, variant, circle = false) {
  const scale = variant === "card" ? 1.18 : 1.5;
  const translateY = variant === "card" ? 35 : 105;
  const expanded = await sharp(source).resize(Math.round(1024 * scale), Math.round(1024 * scale)).png().toBuffer();
  const side = Math.round(1024 * scale);
  const left = Math.round((side - 1024) / 2);
  const top = Math.max(0, Math.min(side - 1024, Math.round((side - 1024) / 2 - translateY)));
  const resized = await sharp(expanded).extract({ left, top, width: 1024, height: 1024 }).resize(size, size).png().toBuffer();
  if (!circle) return resized;
  const mask = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`);
  return sharp(resized).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

function label(text, x, y, size = 24, weight = 500) {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return Buffer.from(`<svg width="720" height="450" xmlns="http://www.w3.org/2000/svg"><text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#25201d">${safe}</text></svg>`);
}

function layerLabel(text) {
  const safe = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return Buffer.from(`<svg width="220" height="35" xmlns="http://www.w3.org/2000/svg"><text x="10" y="25" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#25201d">${safe}</text></svg>`);
}

await fs.mkdir(output, { recursive: true });
const boardRows = [];
for (const combo of combinations) {
  const [slug, title] = combo;
  const target = path.join(output, slug);
  await fs.mkdir(target, { recursive: true });
  const source = await compose(layerPaths(combo));
  const previews = {
    "profile-256.png": await crop(source, 256, "card"),
    "card-128.png": await crop(source, 128, "card"),
    "avatar-64.png": await crop(source, 64, "avatar"),
    "avatar-circle-64.png": await crop(source, 64, "avatar", true),
  };
  await Promise.all(Object.entries(previews).map(([name, value]) => fs.writeFile(path.join(target, name), value)));
  const row = await sharp({ create: { width: 720, height: 450, channels: 4, background: "#fffdf9" } })
    .composite([
      { input: previews["profile-256.png"], left: 25, top: 110 },
      { input: previews["card-128.png"], left: 315, top: 160 },
      { input: previews["avatar-64.png"], left: 480, top: 192 },
      { input: previews["avatar-circle-64.png"], left: 585, top: 192 },
      { input: label(title, 25, 46, 22, 700), left: 0, top: 0 },
      { input: label("256 profile", 80, 395, 16), left: 0, top: 0 },
      { input: label("128 card", 332, 320, 16), left: 0, top: 0 },
      { input: label("64 square", 456, 280, 16), left: 0, top: 0 },
      { input: label("64 circle", 568, 280, 16), left: 0, top: 0 },
    ])
    .png().toBuffer();
  boardRows.push(row);
}

await sharp({ create: { width: 1440, height: 900, channels: 4, background: "#f4f0e8" } })
  .composite(boardRows.map((row, index) => ({ input: row, left: index % 2 === 0 ? 0 : 720, top: Math.floor(index / 2) * 450 })))
  .png().toFile(path.join(output, "golden-mvp-body-redesign-combinations.png"));

const layerSpecs = [
  ["body under outfit", input(mvp, "body", "body-under-outfit.png")],
  ["cream knit sweater", input(mvp, "outfits", "cream-knit-sweater.png")],
  ["front paw left", input(mvp, "body", "front-paw-left.png")],
  ["front paw right", input(mvp, "body", "front-paw-right.png")],
  ["head base", input(mvp, "body", "head-base.png")],
  ["complete composition", input(output, "01-gentle-cream-knit-sweater-minimal-cream", "profile-256.png")],
];
const checker = Buffer.from(`<svg width="220" height="270" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="p" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#f6f6f6"/><path d="M0 0H20V20H0Z" fill="#e4e4e4" opacity=".55"/></pattern></defs><rect width="220" height="270" fill="url(#p)"/></svg>`);
const layerComposites = [];
for (const [index, [name, file]] of layerSpecs.entries()) {
  layerComposites.push(
    { input: checker, left: index * 220, top: 35 },
    { input: await sharp(file).resize(220, 220).png().toBuffer(), left: index * 220, top: 35 },
    { input: layerLabel(name), left: index * 220, top: 0 },
  );
}
const layerBoard = await sharp({ create: { width: 1320, height: 330, channels: 4, background: "#fffdf9" } })
  .composite(layerComposites)
  .png().toBuffer();
await fs.writeFile(path.join(output, "golden-mvp-body-redesign-layers.png"), layerBoard);

console.log(`Rendered ${combinations.length} golden retriever MVP QA sets to ${output}`);
