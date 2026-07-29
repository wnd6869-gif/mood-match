import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const systemRoot = path.join(publicRoot, "avatar-system/round-muzzle/v1");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle");
const checksums = JSON.parse(await fs.readFile(path.join(systemRoot, "checksums.json"), "utf8"));
const manifest = JSON.parse(await fs.readFile(path.join(systemRoot, "manifest.json"), "utf8"));
const expressions = manifest.expressions;
const parts = manifest.layers;

assert.equal(manifest.status, "locked");
assert.equal(manifest.version, "v1");
const familyDefaults = await fs.readFile(path.join(systemRoot, manifest.familyDefaults.file));
assert.equal(
  crypto.createHash("sha256").update(familyDefaults).digest("hex"),
  manifest.familyDefaults.sha256,
  "round-muzzle family default checksum mismatch",
);
for (const expression of expressions) {
  for (const part of parts) {
    const input = await fs.readFile(path.join(expressionRoot, expression, `${part}.svg`));
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    assert.equal(hash, checksums[expression][part], `${expression}/${part} checksum mismatch`);
  }
}

const presetDirectory = path.join(systemRoot, "face-rigs");
const expectedPresetHashes = manifest.faceRigPresets;
const presetFiles = Object.keys(expectedPresetHashes);

const report = [];
for (const file of presetFiles) {
  const presetBytes = await fs.readFile(path.join(presetDirectory, file));
  const presetHash = crypto.createHash("sha256").update(presetBytes).digest("hex");
  assert.equal(presetHash, expectedPresetHashes[file], `${file} FaceRig checksum mismatch`);
  const preset = JSON.parse(presetBytes.toString("utf8"));
  assert.equal(preset.version, "round-muzzle-v1");
  assert.equal(preset.faceFamily, "round-muzzle");
  if (preset.coordinateSystem === "face-centers-v1") {
    for (const center of ["eyeCenter", "browCenter", "mouthCenter"]) {
      assert.equal(typeof preset.anchors[center].x, "number");
      assert.equal(typeof preset.anchors[center].y, "number");
    }
    for (const part of ["eyes", "eyebrows", "mouth"]) {
      assert.equal(typeof preset.layers[part].offsetX, "number");
      assert.equal(typeof preset.layers[part].offsetY, "number");
      assert.ok(preset.layers[part].scaleX > 0);
      assert.ok(preset.layers[part].scaleY > 0);
    }
  } else for (const part of ["eyes", "eyebrows", "mouth"]) {
    assert.equal(typeof preset.anchors[part].x, "number");
    assert.equal(typeof preset.anchors[part].y, "number");
    assert.ok(preset.anchors[part].scaleX > 0);
    assert.ok(preset.anchors[part].scaleY > 0);
  }
  assert.equal(typeof preset.animalId, "string");
  report.push({ file, sha256: presetHash, animalId: preset.animalId, approved: preset.approvedAt !== null });
}

const outfitBases = [];
for (const [outfitBaseId, base] of Object.entries(manifest.outfitBases)) {
  const basePath = path.join(root, "public", base.file.replace(/^\//, ""));
  const metadata = await sharp(basePath).metadata();
  assert.equal(metadata.hasAlpha, true, `${outfitBaseId} base must retain alpha`);
  assert.ok(report.some((preset) => preset.animalId === base.animalId), `${outfitBaseId} has no animal FaceRig`);
  outfitBases.push({ outfitBaseId, animalId: base.animalId, dimensions: `${metadata.width}x${metadata.height}` });
}

console.log(JSON.stringify({ family: manifest.id, version: manifest.version, expressions, verifiedSharedSvgFiles: expressions.length * parts.length, presets: report, outfitBases }, null, 2));
