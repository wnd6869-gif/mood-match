import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const approvalRoot = path.join(projectRoot, "public", "character-assets", "approval", "golden-retriever-v2");
const outputRoot = path.join(approvalRoot, "mvp");
const svgRoot = path.join(outputRoot, "svg");
const pngRoot = path.join(outputRoot, "png");
const basePath = path.join(approvalRoot, "b-animal-base.png");

const svg = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff6df"/><stop offset="1" stop-color="#ead2a5"/></linearGradient>
    <linearGradient id="coral" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f6a18d"/><stop offset="1" stop-color="#d86f64"/></linearGradient>
    <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2f4566"/><stop offset="1" stop-color="#192b48"/></linearGradient>
    <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f7e4c8"/><stop offset="1" stop-color="#d8a679"/></linearGradient>
    <linearGradient id="park" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e4f0d9"/><stop offset="1" stop-color="#9fc7a6"/></linearGradient>
    <linearGradient id="cafe" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f9e8cf"/><stop offset="1" stop-color="#caa784"/></linearGradient>
    <linearGradient id="creamBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8e6"/><stop offset="1" stop-color="#f4e6cc"/></linearGradient>
  </defs>
${body}
</svg>`;

const vectors = {
  "outfits/cream-knit": svg(`
  <path d="M354 778 Q342 726 358 676 Q374 620 432 594 Q466 615 512 621 Q558 615 592 594 Q650 620 666 676 Q682 726 670 778 Q646 798 616 790 Q584 778 556 786 L468 786 Q440 778 408 790 Q378 798 354 778 Z" fill="url(#cream)" stroke="#d3b47d" stroke-width="7" stroke-linejoin="round"/>
  <path d="M438 606 Q459 642 512 648 Q565 642 586 606" fill="none" stroke="#d3b47d" stroke-width="13" stroke-linecap="round"/>
  <path d="M438 653 Q462 679 438 707 Q414 735 438 760 M485 647 Q509 675 485 704 Q461 733 485 766 M539 647 Q515 675 539 704 Q563 733 539 766 M586 653 Q562 679 586 707 Q610 735 586 760" fill="none" stroke="#e0c08d" stroke-width="10" stroke-linecap="round" opacity=".85"/>
  <path d="M406 682 Q512 693 618 682 M393 731 Q512 741 631 731 M382 769 Q512 779 642 769" fill="none" stroke="#fff7e6" stroke-width="5" opacity=".7"/>
`),
  "outfits/navy-shirt": svg(`
  <path d="M364 642 Q391 605 442 596 L512 626 L582 596 Q633 605 660 642 L649 790 Q620 808 596 802 L428 802 Q404 808 375 790 Z" fill="url(#navy)" stroke="#16263e" stroke-width="7" stroke-linejoin="round"/>
  <path d="M444 598 L512 626 L476 674 L429 615 Z M580 598 L512 626 L548 674 L595 615 Z" fill="#e6edf0" stroke="#243957" stroke-width="5" stroke-linejoin="round"/>
  <path d="M512 626 V780" stroke="#456081" stroke-width="5" opacity=".65"/>
  <circle cx="512" cy="695" r="5" fill="#9bb0c7"/>
`),
  "outfits/coral-hoodie": svg(`
  <path d="M391 627 Q392 572 435 558 Q476 577 512 586 Q548 577 589 558 Q632 572 633 627 Q675 645 657 792 Q630 810 602 802 L422 802 Q394 810 367 792 Q349 645 391 627 Z" fill="url(#coral)" stroke="#bd5e59" stroke-width="7" stroke-linejoin="round"/>
  <path d="M426 613 Q468 641 512 642 Q556 641 598 613" fill="none" stroke="#f9b5a4" stroke-width="12" stroke-linecap="round"/>
  <path d="M470 674 Q512 692 554 674 L569 773 Q512 791 455 773 Z" fill="#e98778" opacity=".7"/>
  <path d="M482 646 V666 M542 646 V666" stroke="#ffe1d8" stroke-width="6" stroke-linecap="round"/>
`),
  "accessories/round-glasses": svg(`
  <circle cx="436" cy="414" r="34" fill="none" stroke="#75412e" stroke-width="7"/>
  <circle cx="588" cy="414" r="34" fill="none" stroke="#75412e" stroke-width="7"/>
  <path d="M470 414 Q512 402 554 414 M402 411 L383 405 M622 411 L641 405" fill="none" stroke="#75412e" stroke-width="6" stroke-linecap="round"/>
`),
  "accessories/beret": svg(`
  <path d="M402 277 Q424 226 487 218 Q548 210 608 246 Q628 260 620 283 Q581 305 514 300 Q448 305 402 277 Z" fill="#aebc9b" stroke="#748566" stroke-width="7" stroke-linejoin="round"/>
  <path d="M482 225 Q500 198 522 218" fill="none" stroke="#748566" stroke-width="8" stroke-linecap="round"/>
  <path d="M430 273 Q494 248 589 267" fill="none" stroke="#d3dbc4" stroke-width="7" opacity=".8" stroke-linecap="round"/>
`),
  "props/coffee-behind-paw": svg(`
  <path d="M606 743 H676 L667 834 Q641 851 615 834 Z" fill="url(#cup)" stroke="#9d6b4d" stroke-width="7" stroke-linejoin="round"/>
  <path d="M602 735 Q641 718 680 735 L675 753 Q641 763 607 753 Z" fill="#f7ead4" stroke="#9d6b4d" stroke-width="6"/>
  <path d="M620 775 Q641 783 662 775" fill="none" stroke="#e9c390" stroke-width="7" stroke-linecap="round"/>
`),
  "props/book-behind-paw": svg(`
  <path d="M382 765 L642 765 L630 862 L394 862 Z" fill="#907252" stroke="#634936" stroke-width="8" stroke-linejoin="round"/>
  <path d="M512 765 V862" stroke="#d1b089" stroke-width="6"/>
  <path d="M408 786 Q454 775 493 786 M531 786 Q570 775 616 786" fill="none" stroke="#b99a71" stroke-width="5" opacity=".8"/>
`),
  "backgrounds/minimal-cream": svg(`<rect width="1024" height="1024" fill="url(#creamBg)"/><circle cx="770" cy="220" r="230" fill="#f7e6c8" opacity=".35"/><circle cx="230" cy="810" r="250" fill="#fffdf5" opacity=".45"/>`),
  "backgrounds/warm-cafe": svg(`
  <rect width="1024" height="1024" fill="url(#cafe)"/>
  <rect x="116" y="112" width="310" height="410" rx="30" fill="#fff0cf" opacity=".72"/>
  <path d="M272 112 V522 M116 310 H426" stroke="#d9b184" stroke-width="18" opacity=".45"/>
  <circle cx="766" cy="270" r="136" fill="#d7ad7d" opacity=".22"/><circle cx="864" cy="390" r="182" fill="#fff1d1" opacity=".2"/>
  <path d="M0 804 Q250 742 512 800 Q760 742 1024 804 V1024 H0 Z" fill="#9e765c" opacity=".32"/>
`),
  "backgrounds/green-park": svg(`
  <rect width="1024" height="1024" fill="url(#park)"/>
  <circle cx="170" cy="245" r="210" fill="#cfe5b6" opacity=".55"/><circle cx="835" cy="210" r="250" fill="#8db88e" opacity=".36"/>
  <circle cx="760" cy="612" r="280" fill="#78ab82" opacity=".28"/><circle cx="250" cy="690" r="230" fill="#e9efb8" opacity=".32"/>
  <circle cx="615" cy="170" r="70" fill="#fff4bd" opacity=".58"/><path d="M0 800 Q280 748 512 804 Q760 748 1024 800 V1024 H0 Z" fill="#7da77d" opacity=".36"/>
`),
};

const writeVector = async (key, content) => {
  const svgPath = path.join(svgRoot, `${key}.svg`);
  const pngPath = path.join(pngRoot, `${key}.png`);
  await mkdir(path.dirname(svgPath), { recursive: true });
  await mkdir(path.dirname(pngPath), { recursive: true });
  await writeFile(svgPath, content, "utf8");
  await sharp(Buffer.from(content)).png({ compressionLevel: 9 }).toFile(pngPath);
};

const pawOverlay = async (name, regions) => {
  const canvas = sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const composites = await Promise.all(regions.map(async (region) => ({
    input: await sharp(basePath).extract(region).png().toBuffer(),
    left: region.left,
    top: region.top,
  })));
  await canvas.composite(composites).png({ compressionLevel: 9 }).toFile(path.join(pngRoot, "props", `${name}.png`));
};

await mkdir(svgRoot, { recursive: true });
await mkdir(pngRoot, { recursive: true });
for (const [key, content] of Object.entries(vectors)) await writeVector(key, content);
await pawOverlay("paw-front-coffee", [{ left: 570, top: 778, width: 170, height: 150 }]);
await pawOverlay("paw-front-left-book", [{ left: 293, top: 784, width: 185, height: 146 }]);
await pawOverlay("paw-front-right-book", [{ left: 545, top: 784, width: 185, height: 146 }]);

console.log(`Generated golden retriever MVP assets in ${outputRoot}`);
