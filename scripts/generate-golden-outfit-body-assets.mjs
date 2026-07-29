import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const base = path.join(approval, "b-animal-base.png");
const pngRoot = path.join(approval, "mvp", "png");
const svgRoot = path.join(approval, "mvp", "svg");
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const svg = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff8e6"/><stop offset="1" stop-color="#e7c98f"/></linearGradient>
    <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#385276"/><stop offset="1" stop-color="#1d304c"/></linearGradient>
    <linearGradient id="coral" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f7a48e"/><stop offset="1" stop-color="#d86e63"/></linearGradient>
  </defs>${body}</svg>`;

async function writeSvg(relative, content) {
  const svgPath = path.join(svgRoot, `${relative}.svg`);
  const pngPath = path.join(pngRoot, `${relative}.png`);
  await mkdir(path.dirname(svgPath), { recursive: true });
  await mkdir(path.dirname(pngPath), { recursive: true });
  await writeFile(svgPath, content, "utf8");
  await sharp(Buffer.from(content)).png({ compressionLevel: 9 }).toFile(pngPath);
}

async function cropLayer(name, regions) {
  const target = path.join(pngRoot, "body", `${name}.png`);
  await mkdir(path.dirname(target), { recursive: true });
  const parts = await Promise.all(regions.map(async (region) => ({
    input: await sharp(base).extract(region).png().toBuffer(), left: region.left, top: region.top,
  })));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: transparent } }).composite(parts).png({ compressionLevel: 9 }).toFile(target);
}

async function featheredBaseLayer(name, gradientStops) {
  const target = path.join(pngRoot, "body", `${name}.png`);
  await mkdir(path.dirname(target), { recursive: true });
  const mask = Buffer.from(`<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">${gradientStops}</linearGradient></defs><rect width="1024" height="1024" fill="url(#fade)"/></svg>`);
  await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 }).toFile(target);
}

// The approved original is never changed. The two feather masks overlap at the neck,
// preventing a straight cut line while preserving one shared master silhouette.
await featheredBaseLayer("head-base", '<stop offset="0%" stop-color="white" stop-opacity="1"/><stop offset="55%" stop-color="white" stop-opacity="1"/><stop offset="63%" stop-color="white" stop-opacity="1"/><stop offset="69%" stop-color="white" stop-opacity="0"/><stop offset="100%" stop-color="white" stop-opacity="0"/>');
await featheredBaseLayer("body-silhouette-behind-outfit", '<stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="53%" stop-color="white" stop-opacity="0"/><stop offset="61%" stop-color="white" stop-opacity="1"/><stop offset="100%" stop-color="white" stop-opacity="1"/>');
await cropLayer("front-paw-left", [{ left: 292, top: 824, width: 192, height: 106 }]);
await cropLayer("front-paw-right", [{ left: 540, top: 824, width: 192, height: 106 }]);

await writeSvg("outfits/cream-knit-sweater", svg(`
  <path d="M393 648 Q404 611 450 593 Q480 608 512 610 Q544 608 574 593 Q620 611 631 648 L650 810 Q628 833 598 820 L426 820 Q396 833 374 810 Z" fill="url(#cream)" stroke="#cba96f" stroke-width="7" stroke-linejoin="round"/>
  <path d="M427 647 Q390 650 365 690 Q342 735 354 817 Q374 842 411 821 L433 748 Z" fill="url(#cream)" stroke="#cba96f" stroke-width="7" stroke-linejoin="round"/>
  <path d="M597 647 Q634 650 659 690 Q682 735 670 817 Q650 842 613 821 L591 748 Z" fill="url(#cream)" stroke="#cba96f" stroke-width="7" stroke-linejoin="round"/>
  <path d="M450 605 Q464 635 512 640 Q560 635 574 605" fill="none" stroke="#cba96f" stroke-width="14" stroke-linecap="round"/>
  <path d="M438 662 Q460 688 438 716 Q416 744 438 778 M483 650 Q507 679 483 710 Q459 741 483 790 M541 650 Q517 679 541 710 Q565 741 541 790 M586 662 Q564 688 586 716 Q608 744 586 778" fill="none" stroke="#dfc08a" stroke-width="10" stroke-linecap="round"/>
  <path d="M361 798 Q383 812 409 798 M615 798 Q641 812 663 798" fill="none" stroke="#fff6e1" stroke-width="12" stroke-linecap="round"/>
`));

await writeSvg("outfits/navy-shirt", svg(`
  <path d="M393 650 Q406 615 450 596 L512 622 L574 596 Q618 615 631 650 L650 810 Q628 832 598 820 L426 820 Q396 832 374 810 Z" fill="url(#navy)" stroke="#182842" stroke-width="7" stroke-linejoin="round"/>
  <path d="M427 651 Q390 653 365 692 Q342 736 354 816 Q374 840 411 820 L433 746 Z" fill="url(#navy)" stroke="#182842" stroke-width="7" stroke-linejoin="round"/>
  <path d="M597 651 Q634 653 659 692 Q682 736 670 816 Q650 840 613 820 L591 746 Z" fill="url(#navy)" stroke="#182842" stroke-width="7" stroke-linejoin="round"/>
  <path d="M448 596 L512 622 L477 666 L430 613 Z M576 596 L512 622 L547 666 L594 613 Z" fill="#eef1e8" stroke="#243b58" stroke-width="5" stroke-linejoin="round"/>
  <path d="M512 625 V790" stroke="#506984" stroke-width="5"/><circle cx="512" cy="690" r="5" fill="#a8b7c5"/><circle cx="512" cy="742" r="5" fill="#a8b7c5"/>
  <path d="M361 798 Q383 812 409 798 M615 798 Q641 812 663 798" fill="none" stroke="#4c6381" stroke-width="12" stroke-linecap="round"/>
`));

await writeSvg("outfits/coral-hoodie", svg(`
  <path d="M400 647 Q404 603 442 583 Q478 597 512 601 Q546 597 582 583 Q620 603 624 647 Q648 674 650 810 Q628 833 598 820 L426 820 Q396 833 374 810 Q376 674 400 647 Z" fill="url(#coral)" stroke="#b95c58" stroke-width="7" stroke-linejoin="round"/>
  <path d="M427 649 Q390 652 365 692 Q342 736 354 816 Q374 840 411 820 L433 746 Z" fill="url(#coral)" stroke="#b95c58" stroke-width="7" stroke-linejoin="round"/>
  <path d="M597 649 Q634 652 659 692 Q682 736 670 816 Q650 840 613 820 L591 746 Z" fill="url(#coral)" stroke="#b95c58" stroke-width="7" stroke-linejoin="round"/>
  <path d="M424 626 Q468 660 512 662 Q556 660 600 626" fill="none" stroke="#f9baa8" stroke-width="14" stroke-linecap="round"/>
  <path d="M482 654 V677 M542 654 V677" stroke="#ffe3d9" stroke-width="6" stroke-linecap="round"/>
  <path d="M361 798 Q383 812 409 798 M615 798 Q641 812 663 798" fill="none" stroke="#f7b39f" stroke-width="12" stroke-linecap="round"/>
`));

console.log("Generated golden retriever outfit-ready body layers and long-sleeve outfit layers.");
