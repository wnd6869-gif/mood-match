import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

const basePath = path.join(
  process.cwd(),
  "public/character-assets/animals/ragdoll/dusty-lavender-cardigan/ragdoll-dusty-lavender-cardigan-base.png",
);

const normalized = await sharp(basePath)
  .resize(1024, 1024, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

await sharp(normalized).png().toFile(basePath);
const metadata = await sharp(basePath).metadata();
assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [1024, 1024, true]);
console.log(JSON.stringify({ basePath, dimensions: `${metadata.width}x${metadata.height}`, hasAlpha: metadata.hasAlpha }));
