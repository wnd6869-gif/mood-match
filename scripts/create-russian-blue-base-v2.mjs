import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const directory = path.join(root, "public/character-assets/animals/russian-blue/navy-cardigan");
const originalPath = path.join(directory, "russian-blue.navy-cardigan-base.png");
const faceRepairSource = path.join(directory, "russian-blue.navy-cardigan-face-removal-chroma-source.png");
const outputPath = path.join(directory, "russian-blue.navy-cardigan-base.v2.png");

const patchBounds = { left: 390, top: 250, width: 244, height: 190 };
const faceRepair = await sharp(faceRepairSource)
  .resize(1024, 1024, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .extract(patchBounds)
  .png()
  .toBuffer();

// The generated edit supplies only the texture where the previous nose/mouth
// was. A softly feathered local patch keeps all body, ears, cardigan, paws,
// tail and the rest of the original 1024px asset untouched.
const mask = Buffer.from(`
  <svg width="${patchBounds.width}" height="${patchBounds.height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="f"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <ellipse cx="122" cy="95" rx="100" ry="70" fill="white" filter="url(#f)"/>
  </svg>
`);
const featheredRepair = await sharp(faceRepair)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

await sharp(originalPath)
  .composite([{ input: featheredRepair, left: patchBounds.left, top: patchBounds.top }])
  .png()
  .toFile(outputPath);

const metadata = await sharp(outputPath).metadata();
assert.equal(metadata.width, 1024);
assert.equal(metadata.height, 1024);
assert.equal(metadata.hasAlpha, true);
console.log(JSON.stringify({ outputPath, patchBounds, dimensions: `${metadata.width}x${metadata.height}`, hasAlpha: metadata.hasAlpha }));
