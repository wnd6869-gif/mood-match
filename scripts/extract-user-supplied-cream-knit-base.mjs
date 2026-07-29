import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = "C:\\Users\\민중\\AppData\\Local\\Temp\\codex-clipboard-f1be0a28-4169-4842-8eac-f887bd5de194.png";
const root = process.cwd();
const assetRoot = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2", "mvp");
const copiedSource = path.join(assetRoot, "source", "golden-retriever-cream-knit-green-source.png");
const output = path.join(assetRoot, "png", "fixed-bases", "golden-retriever-cream-knit-base.png");

await mkdir(path.dirname(copiedSource), { recursive: true });
await mkdir(path.dirname(output), { recursive: true });
// Preserve the supplied image verbatim for audit and visual QA.
await copyFile(source, copiedSource);

const { data, info } = await sharp(copiedSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let removed = 0;
let softened = 0;
for (let pixel = 0; pixel < data.length; pixel += 4) {
  const red = data[pixel];
  const green = data[pixel + 1];
  const blue = data[pixel + 2];
  // The supplied PNG has JPEG-like chroma variation. RGB is never changed;
  // only pixels whose green exceeds both other channels by a clear margin lose alpha.
  const greenDominance = green - Math.max(red, blue);
  if (greenDominance >= 150) {
    data[pixel + 3] = 0;
    removed += 1;
  } else if (greenDominance > 80) {
    data[pixel + 3] = Math.round(255 * ((150 - greenDominance) / 70));
    softened += 1;
  }
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`Copied supplied source and removed ${removed} chroma pixels (${softened} soft edge pixels). size=${info.width}x${info.height}`);
