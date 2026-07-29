import fs from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "public", "character-assets", "expressions", "round-muzzle");
const expressions = {
  gentle: { eye: [18, 24], brow: ["M15 28 Q36 18 57 27", "M163 27 Q184 18 205 28"], mouth: "M28 24 Q64 48 100 24" },
  bright: { eye: [21, 27], brow: ["M15 29 Q36 17 57 25", "M163 25 Q184 17 205 29"], mouth: "M26 21 Q64 51 102 21" },
  chic: { eye: [19, 18], brow: ["M17 25 L57 25", "M163 25 L203 25"], mouth: "M36 29 Q64 34 92 29" },
  confident: { eye: [20, 21], brow: ["M15 28 Q36 22 57 24", "M163 24 Q184 22 205 28"], mouth: "M28 25 Q64 45 100 25" },
  playful: { eye: [20, 23, 19], brow: ["M15 22 Q36 12 57 22", "M163 28 Q184 20 205 28"], mouth: "M29 31 Q60 44 96 22" },
};
const wrap = (viewBox, content) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><style>:root{--eye-color:#32140c;--brow-color:#793805;--mouth-color:#5b2615}</style>${content}</svg>`;
for (const [name, spec] of Object.entries(expressions)) {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  const [rx, ry, rightRy = ry] = spec.eye;
  const eyes = `<ellipse cx="36" cy="50" rx="${rx}" ry="${ry}" fill="var(--eye-color)"/><circle cx="29" cy="42" r="5" fill="#fffdf6"/><ellipse cx="188" cy="50" rx="${rx}" ry="${rightRy}" fill="var(--eye-color)"/><circle cx="181" cy="42" r="5" fill="#fffdf6"/>`;
  const brows = spec.brow.map((d) => `<path d="${d}" fill="none" stroke="var(--brow-color)" stroke-width="8" stroke-linecap="round"/>`).join("");
  const mouth = `<path d="${spec.mouth}" fill="none" stroke="var(--mouth-color)" stroke-width="6" stroke-linecap="round"/>`;
  await Promise.all([
    fs.writeFile(path.join(dir, "eyes.svg"), wrap("0 0 224 100", eyes)),
    fs.writeFile(path.join(dir, "eyebrows.svg"), wrap("0 0 224 60", brows)),
    fs.writeFile(path.join(dir, "mouth.svg"), wrap("0 0 128 70", mouth)),
  ]);
}
console.log(`Generated round-muzzle SVG layers at ${root}`);
