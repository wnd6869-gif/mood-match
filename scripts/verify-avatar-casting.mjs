import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const catalog = await readFile(resolve(root, "lib/avatar-catalog.ts"), "utf8");
const requiredBases = [
  "golden-retriever-cream-knit", "golden-retriever-coral-hoodie", "golden-retriever-navy-cardigan",
  "otter-sage-green-hoodie", "brown-bear-sage-green-hoodie", "capybara-sage-cardigan", "welsh-corgi-coral-hoodie",
  "russian-blue-navy-cardigan", "ragdoll-dusty-lavender-cardigan", "scottish-fold-olive-knit",
  "shiba-inu-olive-hoodie", "red-fox-olive-hoodie", "border-collie-charcoal-jacket",
];
for (const base of requiredBases) {
  if (!catalog.includes(`outfitBaseId: \"${base}\"`)) throw new Error(`Missing avatar catalog item: ${base}`);
}
const families = ["round-muzzle", "cat", "pointed-muzzle"];
for (const family of families) {
  const manifest = await readFile(resolve(root, `public/character-assets/avatar-system/${family}/v1/manifest.json`), "utf8").catch(async () => family === "round-muzzle" ? await readFile(resolve(root, "public/character-assets/avatar-system/round-muzzle/v1/manifest.json"), "utf8") : "");
  if (!manifest.includes('"status"')) throw new Error(`Missing face family manifest: ${family}`);
}
const stableHash = createHash("sha256").update(catalog).digest("hex");
console.log(JSON.stringify({ catalogItems: requiredBases.length, deterministicCatalogHash: stableHash, families }, null, 2));
