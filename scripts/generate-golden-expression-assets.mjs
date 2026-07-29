import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const approvalRoot = path.join(
  projectRoot,
  "public",
  "character-assets",
  "approval",
  "golden-retriever-v2",
);
const expressionRoot = path.join(approvalRoot, "expressions");
const svgRoot = path.join(expressionRoot, "svg");
const pngRoot = path.join(expressionRoot, "png");

const svgDocument = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="eyeFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a0d06"/>
      <stop offset="0.58" stop-color="#3c1609"/>
      <stop offset="1" stop-color="#74320d"/>
    </linearGradient>
  </defs>
${body}
</svg>
`;

const eye = ({
  cx,
  cy,
  rx,
  ry,
  pupilRx,
  pupilRy,
  pupilDx = 0,
  highlightRadius,
}) => `
  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#eyeFill)" stroke="#210a05" stroke-width="3"/>
  <ellipse cx="${cx + pupilDx}" cy="${cy + 2}" rx="${pupilRx}" ry="${pupilRy}" fill="#180704"/>
  <circle cx="${cx - 7 + pupilDx}" cy="${cy - 8}" r="${highlightRadius}" fill="#fffdf6"/>
`;

const eyePair = (options) => svgDocument([
  eye({
    cx: options.leftCx ?? 436,
    ...options,
    ry: options.leftRy ?? options.ry,
    pupilDx: options.leftPupilDx ?? options.pupilDx,
    pupilRy: options.leftPupilRy ?? options.pupilRy,
  }),
  eye({
    cx: options.rightCx ?? 588,
    ...options,
    ry: options.rightRy ?? options.ry,
    pupilDx: options.rightPupilDx ?? options.pupilDx,
    pupilRy: options.rightPupilRy ?? options.pupilRy,
  }),
].join(""));

const browPair = (left, right, width = 10) => svgDocument(`
  <path d="${left}" fill="none" stroke="#793805" stroke-width="${width}" stroke-linecap="round"/>
  <path d="${right}" fill="none" stroke="#793805" stroke-width="${width}" stroke-linecap="round"/>
`);

const mouthLine = (pathData, width = 8) => svgDocument(`
  <path d="${pathData}" fill="none" stroke="#7b2f14" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
`);

const expressionSvgs = {
  bright: {
    eyes: eyePair({
      cy: 414,
      rx: 21,
      ry: 27,
      pupilRx: 13,
      pupilRy: 18,
      highlightRadius: 5.5,
    }),
    eyebrows: browPair(
      "M414 354 Q438 337 461 350",
      "M563 350 Q586 337 610 354",
    ),
    mouth: svgDocument(`
  <path d="M458 527 Q512 566 566 527 Q512 579 458 527 Z" fill="#4a190d" stroke="#7b2f14" stroke-width="5" stroke-linejoin="round"/>
  <path d="M483 550 Q512 564 541 550" fill="none" stroke="#b55b3d" stroke-width="4" stroke-linecap="round"/>
`),
  },
  chic: {
    eyes: eyePair({
      cy: 414,
      rx: 21,
      ry: 16,
      pupilRx: 13,
      pupilRy: 12,
      highlightRadius: 4,
    }),
    eyebrows: browPair(
      "M418 353 Q440 350 461 353",
      "M563 353 Q584 350 606 353",
    ),
    mouth: mouthLine("M478 540 Q512 544 546 540", 7),
  },
  confident: {
    eyes: eyePair({
      cy: 414,
      rx: 20,
      ry: 22,
      pupilRx: 14,
      pupilRy: 16,
      highlightRadius: 4.5,
    }),
    eyebrows: browPair(
      "M416 350 Q439 351 461 352",
      "M563 352 Q585 351 608 350",
      12,
    ),
    mouth: mouthLine("M458 531 Q512 556 566 531", 9),
  },
  playful: {
    eyes: eyePair({
      cy: 414,
      rx: 22,
      leftRy: 24,
      rightRy: 21,
      pupilRx: 14,
      leftPupilRy: 16,
      rightPupilRy: 14,
      leftPupilDx: 2,
      rightPupilDx: -2,
      highlightRadius: 5,
      leftCx: 435,
      rightCx: 589,
    }),
    eyebrows: browPair(
      "M413 347 Q437 341 461 350",
      "M563 352 Q586 348 611 353",
      12,
    ),
    mouth: mouthLine("M458 537 Q510 564 568 529", 9),
  },
};

const gentleSources = {
  eyes: "eyes-default.png",
  eyebrows: "eyebrows-default.png",
  mouth: "mouth-default.png",
};

const allExpressions = ["gentle", ...Object.keys(expressionSvgs)];
const requestedExpressions = process.argv.slice(2);
const selectedExpressions = requestedExpressions.length
  ? requestedExpressions
  : allExpressions;

for (const expression of selectedExpressions) {
  if (!allExpressions.includes(expression)) {
    throw new Error(`Unknown expression: ${expression}`);
  }
}

await mkdir(svgRoot, { recursive: true });
await mkdir(pngRoot, { recursive: true });

if (selectedExpressions.includes("gentle")) {
  for (const [part, source] of Object.entries(gentleSources)) {
    await copyFile(
      path.join(approvalRoot, source),
      path.join(pngRoot, `${part}-gentle.png`),
    );
  }
}

for (const expression of selectedExpressions) {
  if (expression === "gentle") continue;
  const parts = expressionSvgs[expression];
  for (const [part, svg] of Object.entries(parts)) {
    const filename = `${part}-${expression}`;
    await writeFile(path.join(svgRoot, `${filename}.svg`), svg, "utf8");
    await sharp(Buffer.from(svg))
      .resize(1024, 1024, { fit: "fill" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(pngRoot, `${filename}.png`));
  }
}

console.log(
  `Generated golden retriever expressions: ${selectedExpressions.join(", ")}`,
);
