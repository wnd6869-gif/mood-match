import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public/character-assets");
const catRoot = path.join(assets, "avatar-system/cat/v1");
const basePath = path.join(
  assets,
  "animals/russian-blue/navy-cardigan/russian-blue.navy-cardigan-base.v2.png",
);
const ragdollBasePath = path.join(
  assets,
  "animals/ragdoll/dusty-lavender-cardigan/ragdoll-dusty-lavender-cardigan-base.v2.png",
);
const scottishFoldBasePath = path.join(
  assets,
  "animals/scottish-fold/olive-knit/scottish-fold-olive-knit-base.png",
);
const expressions = ["gentle", "bright", "chic", "confident", "playful"];
const parts = ["eyes", "eyebrows", "nose-mouth"];
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

const manifest = JSON.parse(await fs.readFile(path.join(catRoot, "manifest.json"), "utf8"));
const rigPath = path.join(catRoot, "face-rigs/russian-blue.navy-cardigan.v1.json");
const rigBytes = await fs.readFile(rigPath);
const rig = JSON.parse(rigBytes.toString("utf8"));
const metadata = await sharp(basePath).metadata();
const ragdollRigPath = path.join(catRoot, "face-rigs/ragdoll.dusty-lavender-cardigan.v1.json");
const ragdollRigBytes = await fs.readFile(ragdollRigPath);
const ragdollRig = JSON.parse(ragdollRigBytes.toString("utf8"));
const ragdollMetadata = await sharp(ragdollBasePath).metadata();
const scottishFoldRigPath = path.join(catRoot, "face-rigs/scottish-fold.olive-knit.v1.json");
const scottishFoldRigBytes = await fs.readFile(scottishFoldRigPath);
const scottishFoldRig = JSON.parse(scottishFoldRigBytes.toString("utf8"));
const scottishFoldMetadata = await sharp(scottishFoldBasePath).metadata();

assert.equal(manifest.id, "cat");
assert.equal(manifest.version, "v1");
assert.deepEqual(manifest.expressions, expressions);
assert.equal(metadata.width, 1024, "Russian Blue base must use the shared 1024px coordinate system");
assert.equal(metadata.height, 1024, "Russian Blue base must use the shared 1024px coordinate system");
assert.equal(metadata.hasAlpha, true, "Russian Blue base must retain alpha");
assert.deepEqual(
  [ragdollMetadata.width, ragdollMetadata.height, ragdollMetadata.hasAlpha],
  [1024, 1024, true],
  "Ragdoll base must use the shared 1024px RGBA coordinate system",
);
assert.deepEqual(
  [scottishFoldMetadata.width, scottishFoldMetadata.height, scottishFoldMetadata.hasAlpha],
  [1024, 1024, true],
  "Scottish Fold base must use the shared 1024px RGBA coordinate system",
);
assert.equal(rig.version, "cat-v1");
assert.equal(rig.faceFamily, "cat");
assert.equal(rig.sourceAssets.sharedExpressionFamily, "cat");
assert.equal(sha256(rigBytes), manifest.faceRigPresets["russian-blue.navy-cardigan.v1.json"]);
assert.equal(ragdollRig.version, "cat-v1");
assert.equal(ragdollRig.faceFamily, "cat");
assert.equal(ragdollRig.sourceAssets.sharedExpressionFamily, "cat");
assert.equal(sha256(ragdollRigBytes), manifest.faceRigPresets["ragdoll.dusty-lavender-cardigan.v1.json"]);
assert.equal(scottishFoldRig.version, "cat-v1");
assert.equal(scottishFoldRig.faceFamily, "cat");
assert.equal(scottishFoldRig.sourceAssets.sharedExpressionFamily, "cat");
assert.equal(sha256(scottishFoldRigBytes), manifest.faceRigPresets["scottish-fold.olive-knit.v1.json"]);

for (const center of ["noseCenter", "eyeCenter", "browCenter", "noseMouth"]) {
  assert.equal(typeof rig.anchors[center].x, "number");
  assert.equal(typeof rig.anchors[center].y, "number");
}
for (const center of ["noseCenter", "eyeCenter", "browCenter", "noseMouth"]) {
  assert.equal(typeof scottishFoldRig.anchors[center].x, "number");
  assert.equal(typeof scottishFoldRig.anchors[center].y, "number");
}
for (const center of ["noseCenter", "eyeCenter", "browCenter", "noseMouth"]) {
  assert.equal(typeof ragdollRig.anchors[center].x, "number");
  assert.equal(typeof ragdollRig.anchors[center].y, "number");
}
for (const layer of ["eyes", "eyebrows", "noseMouth"]) {
  assert.ok(rig.layers[layer].scaleX > 0);
  assert.ok(rig.layers[layer].scaleY > 0);
}

const assetHashes = {};
for (const expression of expressions) {
  for (const part of parts) {
    const file = path.join(catRoot, "expressions", expression, `${part}.svg`);
    const source = await fs.readFile(file, "utf8");
    assert.match(source, /viewBox=/, `${expression}/${part} must be a local SVG`);
    assert.doesNotMatch(source, /round-muzzle/, `${expression}/${part} may not reuse round-muzzle assets`);
    assetHashes[path.relative(root, file).replaceAll("\\", "/")] = sha256(source);
  }
}
assert.equal("mouthCenter" in rig.anchors, false, "cat FaceRig must not separate mouth from nose");
assert.equal("mouth" in rig.layers, false, "cat FaceRig must use noseMouth as one transform");
const glassesPath = path.join(catRoot, "accessories/round-glasses.svg");
assetHashes[path.relative(root, glassesPath).replaceAll("\\", "/")] = sha256(await fs.readFile(glassesPath));

console.log(JSON.stringify({
  family: "cat-v1",
  base: { dimensions: `${metadata.width}x${metadata.height}`, hasAlpha: metadata.hasAlpha },
  ragdoll: { dimensions: `${ragdollMetadata.width}x${ragdollMetadata.height}`, hasAlpha: ragdollMetadata.hasAlpha, faceRigSha256: sha256(ragdollRigBytes) },
  scottishFold: { dimensions: `${scottishFoldMetadata.width}x${scottishFoldMetadata.height}`, hasAlpha: scottishFoldMetadata.hasAlpha, faceRigSha256: sha256(scottishFoldRigBytes) },
  faceRigSha256: sha256(rigBytes),
  sharedAssetHashes: assetHashes,
}, null, 2));
