import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const expressions = path.join(approval, "expressions", "png");
const out = path.join(approval, "mvp", "qa", "beret-redesign");
const base = path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png");
const bg = path.join(png, "backgrounds", "minimal-cream.png");
const glasses = path.join(png, "accessories", "round-glasses.png");
const beret = path.join(png, "accessories", "beret.png");
const FACE_OFFSET_Y = -108;

const cases = [
  ["gentle-beret", "gentle + cream knit + beret", "gentle"],
  ["confident-beret", "confident + cream knit + beret", "confident"],
  ["chic-glasses-beret", "chic + round glasses + beret", "chic", true],
];
const label = (text, width = 330, height = 42) => Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="10" y="28" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#2b2522">${text}</text></svg>`);
const circleMask = Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white"/></svg>');

async function compose(expression, withGlasses) {
  const { width, height } = await sharp(base).metadata();
  const face = await Promise.all(["eyes", "eyebrows", "mouth"].map(async (part) => ({
    input: await sharp(path.join(expressions, `${part}-${expression}.png`)).resize(width, height).png().toBuffer(), left: 0, top: FACE_OFFSET_Y,
  })));
  const overlays = withGlasses ? [{ input: await sharp(glasses).resize(width, height).png().toBuffer(), left: 0, top: FACE_OFFSET_Y }] : [];
  overlays.push({ input: await sharp(beret).resize(width, height).png().toBuffer() });
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([{ input: await sharp(bg).resize(width, height).png().toBuffer() }, { input: await sharp(base).png().toBuffer() }, ...face, ...overlays])
    .png().toBuffer();
}

await fs.mkdir(out, { recursive: true });
const boardComposites = [];
for (const [index, [slug, title, expression, withGlasses]] of cases.entries()) {
  const image = await compose(expression, withGlasses);
  await fs.writeFile(path.join(out, `${slug}.png`), image);
  const previews = {
    p256: await sharp(image).resize(256, 256).png().toBuffer(),
    p128: await sharp(image).resize(128, 128).png().toBuffer(),
    p64: await sharp(image).resize(64, 64).png().toBuffer(),
    circle: await sharp(image).resize(64, 64).composite([{ input: circleMask, blend: "dest-in" }]).png().toBuffer(),
  };
  await Promise.all(Object.entries(previews).map(([name, value]) => fs.writeFile(path.join(out, `${slug}-${name}.png`), value)));
  const top = 20 + index * 320;
  boardComposites.push(
    { input: label(title), left: 25, top },
    { input: previews.p256, left: 25, top: top + 40 }, { input: previews.p128, left: 320, top: top + 90 },
    { input: previews.p64, left: 490, top: top + 122 }, { input: previews.circle, left: 590, top: top + 122 },
    { input: label("256", 70, 32), left: 105, top: top + 296 }, { input: label("128", 70, 32), left: 350, top: top + 222 },
    { input: label("64 square", 90, 32), left: 470, top: top + 202 }, { input: label("64 circle", 90, 32), left: 575, top: top + 202 },
  );
}
await sharp({ create: { width: 700, height: 980, channels: 4, background: "#f7f3ea" } }).composite(boardComposites).png().toFile(path.join(out, "beret-redesign-qa.png"));
console.log(`Rendered beret QA to ${out}`);
