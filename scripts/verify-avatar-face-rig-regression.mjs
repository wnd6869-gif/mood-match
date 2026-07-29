import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicRoot = path.join(root, "public/character-assets");
const systemRoot = path.join(publicRoot, "avatar-system/round-muzzle/v1");
const expressionRoot = path.join(publicRoot, "expressions/round-muzzle");
const qaRoot = path.join(systemRoot, "qa/regression");
const expressions = ["gentle", "bright", "chic", "confident", "playful"];
const partSizes = { eyes: [224, 100], eyebrows: [224, 60], mouth: [128, 70] };
const visualCenters = { eyes: [111.5, 49.5], eyebrows: [109.5, 24.5], mouth: [63.5, 29.5] };
const goldenOutfitBases = [
  ["creamKnit", "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-cream-knit-base.png"],
  ["coralHoodie", "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-coral-hoodie-base.png"],
  ["navyCardigan", "/character-assets/approval/golden-retriever-v2/mvp/png/fixed-bases/golden-retriever-navy-cardigan-base.png"],
];
const requestedOrder = [
  ...goldenOutfitBases.map(([outfitBaseId]) => `golden-retriever:${outfitBaseId}`),
  "otter:sageHoodie",
  "welsh-corgi:coralHoodie",
  "capybara:sageCardigan",
  "brown-bear:sageHoodie",
  ...goldenOutfitBases.map(([outfitBaseId]) => `golden-retriever:${outfitBaseId}`),
  "otter:sageHoodie",
  "welsh-corgi:coralHoodie",
  "capybara:sageCardigan",
];

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function deepMerge(base, override) {
  const output = clone(base);
  if (!isRecord(override)) return output;
  for (const [key, value] of Object.entries(override)) {
    output[key] = isRecord(value) && isRecord(output[key])
      ? deepMerge(output[key], value)
      : clone(value);
  }
  return output;
}
function applyRelativeTransform(base, override = {}) {
  return {
    x: base.x + (override.x ?? 0),
    y: base.y + (override.y ?? 0),
    scaleX: base.scaleX * (override.scaleX ?? 1),
    scaleY: base.scaleY * (override.scaleY ?? 1),
    rotation: base.rotation + (override.rotation ?? 0),
  };
}
function resolveFaceRig(defaults, preset, expressionId) {
  const merged = deepMerge(defaults, clone(preset));
  const expressionOverride = clone(preset.expressionTransformOverrides?.[expressionId] ?? {});
  const anchors = clone(merged.anchors);
  if (preset.coordinateSystem === "face-centers-v1") {
    for (const part of Object.keys(partSizes)) {
      const centerName = part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "mouthCenter";
      const center = preset.anchors[centerName];
      const layer = preset.layers[part];
      const override = expressionOverride[part] ?? {};
      const [visualX, visualY] = visualCenters[part];
      const scaleX = layer.scaleX * (override.scaleX ?? 1);
      const scaleY = layer.scaleY * (override.scaleY ?? 1);
      anchors[part] = { x: center.x + layer.offsetX + (override.deltaX ?? 0) - visualX * scaleX, y: center.y + layer.offsetY + (override.deltaY ?? 0) - visualY * scaleY, scaleX, scaleY, rotation: (layer.rotation ?? 0) + (override.rotation ?? 0) };
    }
  } else for (const part of Object.keys(partSizes)) {
    anchors[part] = applyRelativeTransform(merged.anchors[part], expressionOverride[part]);
  }
  return { ...merged, expressionId, anchors };
}

async function hashSourceFiles(manifest) {
  const files = [
    path.join(systemRoot, manifest.familyDefaults.file),
    ...Object.keys(manifest.faceRigPresets).map((file) => path.join(systemRoot, "face-rigs", file)),
    ...expressions.flatMap((expression) => Object.keys(partSizes).map((part) => path.join(expressionRoot, expression, `${part}.svg`))),
  ];
  return Object.fromEntries(await Promise.all(files.map(async (file) => [
    path.relative(root, file).replaceAll("\\", "/"),
    sha256(await fs.readFile(file)),
  ])));
}

async function materializeExpressionLayer(expression, part, color, transform, canvasScale) {
  const svg = await fs.readFile(path.join(expressionRoot, expression, `${part}.svg`), "utf8");
  const cssVariable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "mouth";
  const [naturalWidth, naturalHeight] = partSizes[part];
  return sharp(Buffer.from(svg.replaceAll(`var(--${cssVariable}-color)`, color)))
    .resize(Math.round(naturalWidth * transform.scaleX * canvasScale), Math.round(naturalHeight * transform.scaleY * canvasScale))
    .rotate(transform.rotation, { background: "#00000000" })
    .png()
    .toBuffer();
}

async function renderExpression(defaults, preset, baseSource, expression) {
  const rig = resolveFaceRig(defaults, preset, expression);
  const basePath = path.join(root, "public", baseSource.replace(/^\//, ""));
  const { width, height } = await sharp(basePath).metadata();
  const canvasScale = width / 1024;
  const layers = [{ input: await sharp(basePath).png().toBuffer() }];
  for (const part of Object.keys(partSizes)) {
    const transform = rig.anchors[part];
    layers.push({
      input: await materializeExpressionLayer(expression, part, rig.colors[part], transform, canvasScale),
      left: Math.round(transform.x * canvasScale),
      top: Math.round(transform.y * canvasScale),
    });
  }
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite(layers)
    .png()
    .toBuffer();
}

async function renderAnimal(defaults, presetFile, preset, baseSource, outfitBaseId) {
  const images = {};
  const fingerprints = {};
  for (const expression of expressions) {
    const image = await renderExpression(defaults, preset, baseSource, expression);
    const raw = await sharp(image).raw().toBuffer();
    images[expression] = image;
    fingerprints[`${expression}-256`] = sha256(await sharp(image).resize(256, 256).raw().toBuffer());
    fingerprints[`${expression}-64`] = sha256(await sharp(image).resize(64, 64).raw().toBuffer());
    fingerprints[`${expression}-native`] = sha256(raw);
  }
  return { presetFile, animalId: preset.animalId, outfitBaseId, images, fingerprints };
}

const manifest = JSON.parse(await fs.readFile(path.join(systemRoot, "manifest.json"), "utf8"));
const defaults = JSON.parse(await fs.readFile(path.join(systemRoot, manifest.familyDefaults.file), "utf8"));
const presets = Object.fromEntries(await Promise.all(Object.keys(manifest.faceRigPresets).map(async (file) => [
  file,
  JSON.parse(await fs.readFile(path.join(systemRoot, "face-rigs", file), "utf8")),
])));
const sourceBefore = await hashSourceFiles(manifest);

const goldenPresetFile = "golden-retriever.v1.json";
const otterPresetFile = "otter.v1.json";
const bearPresetFile = "brown-bear.v1.json";
const welshCorgiPresetFile = "welsh-corgi.v1.json";
const capybaraPresetFile = "capybara.v1.json";
const renderGoldenSets = () => Promise.all(goldenOutfitBases.map(([outfitBaseId, baseSource]) => renderAnimal(defaults, goldenPresetFile, presets[goldenPresetFile], baseSource, outfitBaseId)));
const firstGoldenSets = await renderGoldenSets();
const firstOtter = await renderAnimal(defaults, otterPresetFile, presets[otterPresetFile], "/character-assets/animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png", "sageHoodie");
const firstWelshCorgi = await renderAnimal(defaults, welshCorgiPresetFile, presets[welshCorgiPresetFile], "/character-assets/animals/welsh-corgi/coral-hoodie/welsh-corgi-coral-hoodie-base.png", "coralHoodie");
const firstCapybara = await renderAnimal(defaults, capybaraPresetFile, presets[capybaraPresetFile], "/character-assets/animals/capybara/sage-cardigan/capybara-sage-cardigan-base.png", "sageCardigan");
const bear = await renderAnimal(defaults, bearPresetFile, presets[bearPresetFile], "/character-assets/animals/brown-bear/sage-green-hoodie/brown-bear-sage-hoodie-base.png", "sageHoodie");
const secondGoldenSets = await renderGoldenSets();
const secondOtter = await renderAnimal(defaults, otterPresetFile, presets[otterPresetFile], "/character-assets/animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png", "sageHoodie");
const secondWelshCorgi = await renderAnimal(defaults, welshCorgiPresetFile, presets[welshCorgiPresetFile], "/character-assets/animals/welsh-corgi/coral-hoodie/welsh-corgi-coral-hoodie-base.png", "coralHoodie");
const secondCapybara = await renderAnimal(defaults, capybaraPresetFile, presets[capybaraPresetFile], "/character-assets/animals/capybara/sage-cardigan/capybara-sage-cardigan-base.png", "sageCardigan");

for (const [index, firstGolden] of firstGoldenSets.entries()) {
  assert.deepEqual(secondGoldenSets[index].fingerprints, firstGolden.fingerprints, `Brown Bear rendering changed Golden Retriever ${firstGolden.outfitBaseId} pixels`);
}
assert.deepEqual(secondOtter.fingerprints, firstOtter.fingerprints, "Brown Bear rendering changed Otter pixels");
assert.deepEqual(secondWelshCorgi.fingerprints, firstWelshCorgi.fingerprints, "Brown Bear rendering changed Welsh Corgi pixels");
assert.deepEqual(secondCapybara.fingerprints, firstCapybara.fingerprints, "Brown Bear rendering changed Capybara pixels");
const sourceAfter = await hashSourceFiles(manifest);
assert.deepEqual(sourceAfter, sourceBefore, "A FaceRig source asset changed during rendering");

await fs.mkdir(qaRoot, { recursive: true });
const snapshotsPath = path.join(qaRoot, "approved-golden-otter-pixel-snapshots.json");
const approvedSnapshots = {
  version: "round-muzzle-v1",
  goldenRetriever: Object.fromEntries(firstGoldenSets.map((result) => [result.outfitBaseId, result.fingerprints])),
  otter: firstOtter.fingerprints,
  brownBear: bear.fingerprints,
  welshCorgi: firstWelshCorgi.fingerprints,
  capybara: firstCapybara.fingerprints,
};
if (process.argv.includes("--update-snapshots")) {
  await fs.writeFile(snapshotsPath, `${JSON.stringify(approvedSnapshots, null, 2)}\n`);
} else {
  const storedSnapshots = JSON.parse(await fs.readFile(snapshotsPath, "utf8"));
  for (const result of firstGoldenSets) {
    assert.deepEqual(result.fingerprints, storedSnapshots.goldenRetriever[result.outfitBaseId], `Golden Retriever ${result.outfitBaseId} differs from approved snapshot`);
  }
  assert.deepEqual(firstOtter.fingerprints, storedSnapshots.otter, "Otter differs from approved snapshot");
  assert.deepEqual(bear.fingerprints, storedSnapshots.brownBear, "Brown Bear differs from approved snapshot");
  assert.deepEqual(firstWelshCorgi.fingerprints, storedSnapshots.welshCorgi, "Welsh Corgi differs from approved snapshot");
  assert.deepEqual(firstCapybara.fingerprints, storedSnapshots.capybara, "Capybara differs from approved snapshot");
}

const boardLayers = [];
for (const [row, result] of [...firstGoldenSets, firstOtter, firstWelshCorgi, firstCapybara, bear].entries()) {
  for (const [column, expression] of expressions.entries()) {
    const image = result.images[expression];
    boardLayers.push(
      { input: await sharp(image).resize(256, 256).png().toBuffer(), left: column * 256, top: row * 320 },
      { input: await sharp(image).resize(64, 64).png().toBuffer(), left: column * 256 + 96, top: row * 320 + 256 },
    );
  }
}
const boardPath = path.join(qaRoot, "round-muzzle-regression-qa.png");
await sharp({ create: { width: 1280, height: 2240, channels: 4, background: "#f7f3ea" } })
  .composite(boardLayers)
  .png()
  .toFile(boardPath);

const report = {
  order: requestedOrder,
  sourceBefore,
  sourceAfter,
  pixelHashes: {
    goldenBeforeBear: Object.fromEntries(firstGoldenSets.map((result) => [result.outfitBaseId, result.fingerprints])),
    otterBeforeBear: firstOtter.fingerprints,
    welshCorgiBeforeBear: firstWelshCorgi.fingerprints,
    capybaraBeforeBear: firstCapybara.fingerprints,
    brownBear: bear.fingerprints,
    goldenAfterBear: Object.fromEntries(secondGoldenSets.map((result) => [result.outfitBaseId, result.fingerprints])),
    otterAfterBear: secondOtter.fingerprints,
    welshCorgiAfterBear: secondWelshCorgi.fingerprints,
    capybaraAfterBear: secondCapybara.fingerprints,
  },
  assertions: {
    goldenCreamKnitUnchangedAfterBear: true,
    goldenCoralHoodieUnchangedAfterBear: true,
    goldenNavyCardiganUnchangedAfterBear: true,
    otterUnchangedAfterBear: true,
    welshCorgiUnchangedAfterBear: true,
    capybaraUnchangedAfterBear: true,
    sourceAssetsUnchanged: true,
  },
};
await fs.writeFile(path.join(qaRoot, "round-muzzle-regression-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ boardPath, snapshotsPath, reportPath: path.join(qaRoot, "round-muzzle-regression-report.json"), assertions: report.assertions }, null, 2));
