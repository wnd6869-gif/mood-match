import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const svg = path.join(approval, "mvp", "svg");

const neckAssets = {
  "thin-scarf": `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><path d="M407 526 Q512 568 617 526 L608 554 Q512 584 416 554 Z" fill="#a8b992" stroke="#71805f" stroke-width="7"/><path d="M446 552 Q468 574 480 617 L516 584 L493 550" fill="#95a982" stroke="#71805f" stroke-width="6" stroke-linejoin="round"/><path d="M433 537 Q512 563 592 537" fill="none" stroke="#d9e2ca" stroke-width="5" opacity=".8"/></svg>`,
  "ribbon-tie": `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><path d="M505 558 Q466 532 438 552 Q457 586 496 582 Z M519 558 Q558 532 586 552 Q567 586 528 582 Z" fill="#d9867b" stroke="#a95e58" stroke-width="7" stroke-linejoin="round"/><circle cx="512" cy="564" r="16" fill="#f0aaa0" stroke="#a95e58" stroke-width="6"/><path d="M502 578 L486 618 L512 601 L537 618 L522 578" fill="#c97169" stroke="#a95e58" stroke-width="6" stroke-linejoin="round"/></svg>`,
};
for (const [id, content] of Object.entries(neckAssets)) {
  const svgPath = path.join(svg, "neck-accessories", `${id}.svg`);
  const pngPath = path.join(png, "neck-accessories", `${id}.png`);
  await mkdir(path.dirname(svgPath), { recursive: true });
  await mkdir(path.dirname(pngPath), { recursive: true });
  await writeFile(svgPath, content, "utf8");
  await sharp(Buffer.from(content)).png({ compressionLevel: 9 }).toFile(pngPath);
}

const base = path.join(png, "fixed-bases", "golden-retriever-cream-knit-base.png");
const coffeeSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254"><path d="M736 917 H818 L807 1058 Q777 1080 747 1058 Z" fill="#e7c28f" stroke="#9b6b4d" stroke-width="8" stroke-linejoin="round"/><path d="M731 910 Q777 891 823 910 L817 932 Q777 943 737 932 Z" fill="#fff1d4" stroke="#9b6b4d" stroke-width="7"/><path d="M755 965 Q777 974 800 965" fill="none" stroke="#c99162" stroke-width="7" stroke-linecap="round"/></svg>`);
const paw = await sharp(base).extract({ left: 670, top: 1020, width: 180, height: 160 }).png().toBuffer();
const coffeePath = path.join(png, "hand-props", "coffee-fixed-base.png");
await mkdir(path.dirname(coffeePath), { recursive: true });
await sharp({ create: { width: 1254, height: 1254, channels: 4, background: "#00000000" } })
  .composite([{ input: coffeeSvg }, { input: paw, left: 670, top: 1020 }])
  .png({ compressionLevel: 9 }).toFile(coffeePath);
console.log("Generated two neck accessories and fixed-base coffee hand prop.");
