import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

const directory = path.join(process.cwd(), "public/character-assets/animals/ragdoll/dusty-lavender-cardigan");
const originalPath = path.join(directory, "ragdoll-dusty-lavender-cardigan-base.png");
const faceRepairSource = path.join(directory, "ragdoll-dusty-lavender-cardigan-face-removal-chroma-source.png");
const outputPath = path.join(directory, "ragdoll-dusty-lavender-cardigan-base.v2.png");
const patchBounds = { left: 385, top: 215, width: 254, height: 205 };

const smoothMaskPatch = await sharp(faceRepairSource)
  .resize(1024, 1024, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .extract(patchBounds)
  .png()
  .toBuffer();
const mask = Buffer.from(`
  <svg width="${patchBounds.width}" height="${patchBounds.height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="feather"><feGaussianBlur stdDeviation="7"/></filter></defs>
    <ellipse cx="127" cy="103" rx="107" ry="76" fill="white" filter="url(#feather)"/>
  </svg>
`);
const featheredPatch = await sharp(smoothMaskPatch)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

// Retain the approved Ragdoll body exactly. Only the local face center is
// replaced with the blank-fur repair so future nose-mouth SVGs cannot double.
await sharp(originalPath)
  .composite([{ input: featheredPatch, left: patchBounds.left, top: patchBounds.top }])
  .png()
  .toFile(outputPath);
const metadata = await sharp(outputPath).metadata();
assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [1024, 1024, true]);
console.log(JSON.stringify({ outputPath, patchBounds, dimensions: `${metadata.width}x${metadata.height}`, hasAlpha: metadata.hasAlpha }));
