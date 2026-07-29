import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const expressions = path.join(approval, "expressions", "png");
const out = path.join(approval, "mvp", "qa", "navy-cardigan-fixed-base");
const bases = {
  cream: path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png"),
  coral: path.join(png, "fixed-bases", "golden-retriever-coral-hoodie-base.png"),
  navy: path.join(png, "fixed-bases", "golden-retriever-navy-cardigan-base.png"),
};
const bg = {
  minimal: path.join(png, "backgrounds", "minimal-cream.png"),
  park: path.join(png, "backgrounds", "green-park.png"),
  cafe: path.join(png, "backgrounds", "warm-cafe.png"),
};
const glasses = path.join(png, "accessories", "round-glasses.png");
const sparkles = path.join(root, "public", "character-assets", "foreground-effects", "original", "warm-sparkles-v1.png");
const offsetY = -108;
const cases = [
  ["gentle-minimal", "gentle · minimal cream", "gentle", bg.minimal],
  ["chic-glasses-cafe", "chic · round glasses · warm cafe", "chic", bg.cafe, glasses],
  ["confident-park", "confident · green park", "confident", bg.park],
  ["playful-sparkles", "playful · warm sparkles · minimal cream", "playful", bg.minimal, undefined, sparkles],
];
const label = (text, w = 340, h = 34) => Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="6" y="23" font-family="Arial" font-size="15" font-weight="700" fill="#2b2522">${text}</text></svg>`);
const circle = Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white"/></svg>');

async function compose(base, expression, background, accessory, effect) {
  const { width, height } = await sharp(base).metadata();
  const face = await Promise.all(["eyes", "eyebrows", "mouth"].map(async (part) => ({ input: await sharp(path.join(expressions, `${part}-${expression}.png`)).resize(width, height).png().toBuffer(), left: 0, top: offsetY })));
  const layers = [{ input: await sharp(background).resize(width, height).png().toBuffer() }, { input: await sharp(base).png().toBuffer() }, ...face];
  if (accessory) layers.push({ input: await sharp(accessory).resize(width, height).png().toBuffer(), left: 0, top: offsetY });
  if (effect) layers.push({ input: await sharp(effect).resize(width, height).png().toBuffer() });
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(layers).png().toBuffer();
}

await fs.mkdir(out, { recursive: true });
const board = [];
for (const [index, [slug, title, expression, background, accessory, effect]] of cases.entries()) {
  const image = await compose(bases.navy, expression, background, accessory, effect);
  await fs.writeFile(path.join(out, `${slug}.png`), image);
  const [p256, p128, p64] = await Promise.all([sharp(image).resize(256).png().toBuffer(), sharp(image).resize(128).png().toBuffer(), sharp(image).resize(64).png().toBuffer()]);
  const pCircle = await sharp(p64).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer();
  const top = 20 + index * 310;
  board.push({ input: label(title), left: 20, top }, { input: p256, left: 20, top: top + 34 }, { input: p128, left: 312, top: top + 86 }, { input: p64, left: 478, top: top + 118 }, { input: pCircle, left: 578, top: top + 118 }, { input: label("256",44,28),left:118,top:top+290 }, { input: label("128",44,28),left:350,top:top+220 }, { input: label("64 square",88,28),left:468,top:top+202 }, { input: label("64 circle",88,28),left:572,top:top+202 });
}
await sharp({ create: { width: 700, height: 1260, channels: 4, background: "#f7f3ea" } }).composite(board).png().toFile(path.join(out, "navy-cardigan-composition-qa.png"));

const comparison = await Promise.all([bases.cream, bases.coral, bases.navy].map((base) => compose(base, "gentle", bg.minimal).then((image) => sharp(image).resize(256).png().toBuffer())));
const round = await Promise.all(comparison.map((image) => sharp(image).resize(64).composite([{ input: circle, blend: "dest-in" }]).png().toBuffer()));
await sharp({ create: { width: 768, height: 340, channels: 4, background: "#f7f3ea" } }).composite([...comparison.map((input, i) => ({ input, left: i * 256, top: 0 })), ...round.map((input, i) => ({ input, left: 96 + i * 256, top: 270 }))]).png().toFile(path.join(out, "three-base-comparison.png"));
await sharp(bases.navy).resize(512).png().toFile(path.join(out, "navy-cardigan-base-transparent-preview.png"));
console.log(`Rendered navy cardigan fixed-base QA to ${out}`);
