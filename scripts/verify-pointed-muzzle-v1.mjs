import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const family = path.join(root, "public/character-assets/avatar-system/pointed-muzzle/v1");
const baseByRig = {
  "shiba-inu.olive-hoodie.v1.json": path.join(root, "public/character-assets/animals/shiba-inu/olive-hoodie/shiba-inu.olive-hoodie-base.v2.png"),
  "red-fox.olive-hoodie.v1.json": path.join(root, "public/character-assets/animals/red-fox/olive-hoodie/red-fox.olive-hoodie-base.png"),
  "border-collie.charcoal-jacket.v1.json": path.join(root, "public/character-assets/animals/border-collie/charcoal-jacket/border-collie.charcoal-jacket-base.png"),
};
const sha = (data) => crypto.createHash("sha256").update(data).digest("hex");
const [manifest, checksums] = await Promise.all([
  fs.readFile(path.join(family, "manifest.json"), "utf8").then(JSON.parse),
  fs.readFile(path.join(family, "checksums.json"), "utf8").then(JSON.parse),
]);
assert.equal(manifest.id, "pointed-muzzle");
assert.equal(manifest.version, "v1");
assert.deepEqual(manifest.layers, ["eyes", "eyebrows", "snout-mark"]);
const rigs = {};
for (const [rigFile, expectedHash] of Object.entries(manifest.faceRigPresets)) {
  const rigBytes = await fs.readFile(path.join(family, "face-rigs", rigFile));
  const rig = JSON.parse(rigBytes.toString("utf8")), metadata = await sharp(baseByRig[rigFile]).metadata();
  assert.deepEqual([metadata.width, metadata.height, metadata.hasAlpha], [1024, 1024, true]);
  assert.equal(rig.faceFamily, "pointed-muzzle");
  assert.equal(rig.sourceAssets.sharedExpressionFamily, "pointed-muzzle");
  assert.equal(rig.coordinateSystem, "face-centers-v1");
  assert.equal(sha(rigBytes), expectedHash);
  for (const center of ["noseCenter", "eyeCenter", "browCenter", "snoutMark"]) assert.equal(typeof rig.anchors[center].x, "number");
  assert.equal("mouthCenter" in rig.anchors, false);
  assert.equal("noseMouth" in rig.anchors, false);
  rigs[rig.animalId] = { dimensions: `${metadata.width}x${metadata.height}`, hasAlpha: metadata.hasAlpha, faceRigSha256: sha(rigBytes) };
}
for (const [relative, expected] of Object.entries(checksums)) {
  const source = await fs.readFile(path.join(family, relative));
  assert.equal(sha(source), expected, `immutable checksum mismatch: ${relative}`);
  if (relative.endsWith(".svg")) { assert.match(source.toString("utf8"), /viewBox=/); assert.doesNotMatch(source.toString("utf8"), /round-muzzle|avatar-system\/cat/); }
}
console.log(JSON.stringify({ family: "pointed-muzzle-v1", rigs, immutableAssets: Object.keys(checksums).length }, null, 2));
