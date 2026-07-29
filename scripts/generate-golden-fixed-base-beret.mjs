import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assetRoot = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2", "mvp");
const svgPath = path.join(assetRoot, "svg", "accessories", "beret.svg");
const pngPath = path.join(assetRoot, "png", "accessories", "beret.png");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="sage" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b7c09a"/><stop offset="1" stop-color="#7e8d65"/></linearGradient>
  </defs>
  <g transform="rotate(-11 610 205)">
    <!-- soft contact shadow follows the head curve -->
    <path d="M496 238 Q581 260 704 230" fill="none" stroke="#6e593b" stroke-width="14" stroke-linecap="round" opacity=".22"/>
    <!-- asymmetric fabric dome, deliberately not an oval plate -->
    <path d="M492 231 Q495 183 530 154 Q567 124 620 134 Q672 141 704 181 Q725 207 709 228 Q672 249 614 251 Q544 253 492 231 Z" fill="url(#sage)" stroke="#657351" stroke-width="8" stroke-linejoin="round"/>
    <path d="M535 183 Q579 151 629 158 Q670 164 691 195" fill="none" stroke="#d8dfc2" stroke-width="8" stroke-linecap="round" opacity=".7"/>
    <path d="M510 224 Q559 242 621 239 Q671 237 703 218" fill="none" stroke="#718058" stroke-width="5" opacity=".65"/>
    <!-- short fabric tab -->
    <path d="M590 142 Q595 116 612 111 Q628 121 628 146" fill="#93a176" stroke="#657351" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- soft, curved front rim -->
    <path d="M493 225 Q565 247 632 241 Q680 238 709 220 L708 239 Q663 264 605 266 Q543 265 497 245 Z" fill="#94a176" stroke="#657351" stroke-width="7" stroke-linejoin="round"/>
    <path d="M510 237 Q575 255 647 250 Q681 247 700 233" fill="none" stroke="#d6dec0" stroke-width="5" opacity=".75" stroke-linecap="round"/>
  </g>
</svg>`;

await mkdir(path.dirname(svgPath), { recursive: true });
await mkdir(path.dirname(pngPath), { recursive: true });
await writeFile(svgPath, svg, "utf8");
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(pngPath);
console.log(`Generated redesigned sage beret: ${pngPath}`);
