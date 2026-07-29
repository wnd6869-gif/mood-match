import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const mvp = path.join(assets, "mvp", "png");
const expected = [
  "body/head-base.png", "body/body-silhouette-behind-outfit.png", "body/front-paw-left.png", "body/front-paw-right.png",
  "outfit-body/cream-knit-sweater.png",
  "fixed-bases/golden-retriever-cream-knit-base.png", "fixed-bases/golden-retriever-coral-hoodie-base.png", "fixed-bases/golden-retriever-navy-cardigan-base.png",
  "neck-accessories/thin-scarf.png", "neck-accessories/ribbon-tie.png",
  "hand-props/coffee-fixed-base.png",
  "outfits/cream-knit-sweater.png", "outfits/navy-shirt.png", "outfits/coral-hoodie.png",
  "accessories/round-glasses.png", "accessories/beret.png",
  "props/coffee-behind-paw.png", "props/paw-front-coffee.png",
  "props/book-behind-paw.png", "props/paw-front-left-book.png", "props/paw-front-right-book.png",
  "backgrounds/minimal-cream.png", "backgrounds/warm-cafe.png", "backgrounds/green-park.png",
];
const baseHash = "354674FB8C4BE278E5B593E0C4EDDA671BF87F9B16C576B64F2EDCB7A392809B";
const expectedDimensions = {
  "fixed-bases/golden-retriever-cream-knit-base.png": 1254,
  "fixed-bases/golden-retriever-coral-hoodie-base.png": 1254,
  "fixed-bases/golden-retriever-navy-cardigan-base.png": 1254,
  "hand-props/coffee-fixed-base.png": 1254,
};

function hash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

async function alphaBounds(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const base = await fs.readFile(path.join(assets, "b-animal-base.png"));
if (hash(base) !== baseHash) throw new Error("Approved golden retriever base hash changed.");

for (const relative of expected) {
  const file = path.join(mvp, relative);
  const meta = await sharp(file).metadata();
  const expectedSize = expectedDimensions[relative] ?? 1024;
  if (meta.width !== expectedSize || meta.height !== expectedSize || !meta.hasAlpha) {
    throw new Error(`${relative} must be a ${expectedSize}×${expectedSize} RGBA PNG.`);
  }
  const bounds = await alphaBounds(file);
  if (!bounds) throw new Error(`${relative} contains no visible pixels.`);
  const isBackground = relative.startsWith("backgrounds/");
  if (!isBackground && (bounds.x === 0 || bounds.y === 0 || bounds.x + bounds.width === expectedSize || bounds.y + bounds.height === expectedSize)) {
    throw new Error(`${relative} touches a canvas edge; expected a full transparent canvas around the layer.`);
  }
  console.log(`${relative}: ${JSON.stringify(bounds)}`);
}

const ruleSource = await fs.readFile(path.join(root, "lib", "character", "golden-retriever-mvp.ts"), "utf8");
for (const requiredRule of ["maxOutfits: 1", "maxFaceAccessories: 1", "maxBackgrounds: 1", "handProps: \"deprecated-and-never-selectable\"", "neckAccessories: \"deprecated-and-never-selectable\"", "roundGlassesCompatibleWithExpressions: true"]) {
  if (!ruleSource.includes(requiredRule)) throw new Error(`Missing composition rule: ${requiredRule}`);
}
console.log("Approved base hash unchanged and redesigned body/outfit MVP layers pass 1024px RGBA/canvas validation.");
