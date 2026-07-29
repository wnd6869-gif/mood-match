import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";

const basePath = path.join(
  process.cwd(),
  "public/character-assets/animals/russian-blue/navy-cardigan/russian-blue.navy-cardigan-base.png",
);

// The source illustration is a complete animal+outfit asset. This only
// normalizes its canvas to the shared 1024px FaceRig coordinate system; it
// does not redraw, crop, or compose any character pixels.
const normalized = await sharp(basePath)
  .resize(1024, 1024, { fit: "fill", kernel: sharp.kernel.lanczos3 })
  .png()
  .toBuffer();

await sharp(normalized).png().toFile(basePath);
const metadata = await sharp(basePath).metadata();
assert.equal(metadata.width, 1024);
assert.equal(metadata.height, 1024);
assert.equal(metadata.hasAlpha, true);

console.log(JSON.stringify({ basePath, dimensions: `${metadata.width}x${metadata.height}`, hasAlpha: metadata.hasAlpha }));
