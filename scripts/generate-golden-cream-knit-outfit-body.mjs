import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const png = path.join(approval, "mvp", "png");
const svg = path.join(approval, "mvp", "svg");
const bodySilhouette = path.join(png, "body", "body-silhouette-behind-outfit.png");
const leftPaw = path.join(png, "body", "front-paw-left.png");
const rightPaw = path.join(png, "body", "front-paw-right.png");
const output = path.join(png, "outfit-body", "cream-knit-sweater.png");
const vectorOutput = path.join(svg, "outfit-body", "cream-knit-sweater.svg");

const sweaterSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="knit" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff9e8"/><stop offset="1" stop-color="#e5c58a"/></linearGradient></defs>
<!-- One continuous animal-sweater silhouette: chest, shoulders and both canine sleeves. -->
<path d="M389 650 Q402 605 451 584 Q481 602 512 605 Q543 602 573 584 Q622 605 635 650 L652 804 Q632 836 600 822 Q559 854 512 861 Q465 854 424 822 Q392 836 372 804 Z" fill="url(#knit)" stroke="#c7a168" stroke-width="8" stroke-linejoin="round"/>
<path d="M429 638 Q374 635 340 681 Q310 730 323 809 Q338 839 381 829 Q407 817 422 789 L445 698 Z" fill="url(#knit)" stroke="#c7a168" stroke-width="8" stroke-linejoin="round"/>
<path d="M595 638 Q650 635 684 681 Q714 730 701 809 Q686 839 643 829 Q617 817 602 789 L579 698 Z" fill="url(#knit)" stroke="#c7a168" stroke-width="8" stroke-linejoin="round"/>
<!-- collar runs behind the head's lower neck fur -->
<path d="M445 596 Q465 637 512 641 Q559 637 579 596" fill="none" stroke="#c7a168" stroke-width="16" stroke-linecap="round"/>
<path d="M440 660 Q461 687 440 718 Q419 749 440 790 M484 646 Q508 679 484 713 Q460 747 484 820 M540 646 Q516 679 540 713 Q564 747 540 820 M584 660 Q563 687 584 718 Q605 749 584 790" fill="none" stroke="#ddbc80" stroke-width="11" stroke-linecap="round"/>
<path d="M358 796 Q379 814 404 799 M620 799 Q645 814 666 796" fill="none" stroke="#fff5dc" stroke-width="14" stroke-linecap="round"/>
<path d="M397 739 Q512 754 627 739 M394 790 Q512 812 630 790" fill="none" stroke="#f7e5bd" stroke-width="5" opacity=".82"/>
</svg>`;

await mkdir(path.dirname(output), { recursive: true });
await mkdir(path.dirname(vectorOutput), { recursive: true });
await writeFile(vectorOutput, sweaterSvg, "utf8");
const sweater = await sharp(Buffer.from(sweaterSvg)).png().toBuffer();
// The final runtime asset intentionally bakes fur silhouette, sleeves and paws together.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: "#00000000" } })
  .composite([{ input: bodySilhouette }, { input: sweater }, { input: leftPaw }, { input: rightPaw }])
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`Generated unified cream-knit outfit-body at ${output}`);
