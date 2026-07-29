import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const output = path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png");
const chromaPreview = path.join(approval, "mvp", "qa", "cream-knit-fixed-base", "green-background-source.png");
const outfitBody = path.join(png, "outfit-body", "cream-knit-sweater.png");
const headBase = path.join(png, "body", "head-base.png");

await mkdir(path.dirname(output), { recursive: true });
await mkdir(path.dirname(chromaPreview), { recursive: true });
const layers = [{ input: outfitBody }, { input: headBase }];
// The transparent output is the exact same master as the green QA source;
// only the flat diagnostic background differs. No face layer is baked in.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } })
  .composite(layers).png({ compressionLevel: 9 }).toFile(output);
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00ff00" } })
  .composite(layers).png({ compressionLevel: 9 }).toFile(chromaPreview);
console.log(`Generated fixed transparent cream-knit base: ${output}`);
