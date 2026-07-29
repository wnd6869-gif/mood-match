import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const approval = path.join(root, "public", "character-assets", "approval", "golden-retriever-v2");
const expressions = path.join(approval, "expressions", "png");
const svgs = path.join(root, "public", "character-assets", "expressions", "round-muzzle");
const png = path.join(approval, "mvp", "png");
const out = path.join(approval, "mvp", "qa", "round-muzzle-svg");
const sparkles = path.join(root, "public", "character-assets", "foreground-effects", "original", "warm-sparkles-v1.png");
const cases = [
  ["gentle", "golden-retriever-cream-knit", "gentle"], ["bright", "golden-retriever-coral-hoodie", "bright"],
  ["chic", "golden-retriever-navy-cardigan", "chic", true], ["confident", "golden-retriever-cream-knit", "confident"],
  ["playful", "golden-retriever-coral-hoodie", "playful", false, true],
];
const bases = Object.fromEntries(["cream-knit", "coral-hoodie", "navy-cardigan"].map((x) => [x, path.join(png, "fixed-bases", `golden-retriever-${x}-base.png`)]));
const bg = path.join(png, "backgrounds", "minimal-cream.png"); const glasses = path.join(png, "accessories", "round-glasses.png");
const circle = Buffer.from('<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white"/></svg>');
async function face(expression, kind, width, height) {
  if (kind === "legacy") return Promise.all(["eyes","eyebrows","mouth"].map(async (part) => ({ input: await sharp(path.join(expressions, `${part}-${expression}.png`)).resize(width,height).png().toBuffer(), left:0, top:-108 })));
  const scale = width / 1024;
  const boxes = { eyes:[400,364,224,100], eyebrows:[400,330,224,60], mouth:[448,515,128,70] };
  return Promise.all(Object.entries(boxes).map(async ([part,[left,top,w,h]]) => ({ input: await sharp(path.join(svgs,expression,`${part}.svg`)).resize(Math.round(w * scale),Math.round(h * scale)).png().toBuffer(), left: Math.round(left * scale), top: Math.round(top * scale) - 108 })));
}
async function compose(baseId, expression, kind, withGlasses, withSparkles) {
  const base = bases[baseId.replace("golden-retriever-", "")]; const {width,height}=await sharp(base).metadata();
  const layers=[{input:await sharp(bg).resize(width,height).png().toBuffer()},{input:await sharp(base).png().toBuffer()},...(await face(expression,kind,width,height))];
  if(withGlasses) layers.push({input:await sharp(glasses).resize(width,height).png().toBuffer(),left:0,top:-108}); if(withSparkles) layers.push({input:await sharp(sparkles).resize(width,height).png().toBuffer()});
  return sharp({create:{width,height,channels:4,background:"#00000000"}}).composite(layers).png().toBuffer();
}
await fs.mkdir(out,{recursive:true}); const board=[];
for(const [i,[name,base,expression,withGlasses=false,withSparkles=false]] of cases.entries()) { const [legacy,svg]=await Promise.all([compose(base,expression,"legacy",withGlasses,withSparkles),compose(base,expression,"svg",withGlasses,withSparkles)]); await fs.writeFile(path.join(out,`${name}-legacy.png`),legacy); await fs.writeFile(path.join(out,`${name}-svg.png`),svg); const top=20+i*210; for(const [j,img] of [legacy,svg].entries()){const p=await sharp(img).resize(128).png().toBuffer();const a=await sharp(img).resize(64).png().toBuffer();const c=await sharp(a).composite([{input:circle,blend:"dest-in"}]).png().toBuffer();board.push({input:p,left:20+j*320,top},{input:a,left:170+j*320,top:32},{input:c,left:250+j*320,top:32});}}
await sharp({create:{width:700,height:1070,channels:4,background:"#f7f3ea"}}).composite(board).png().toFile(path.join(out,"legacy-vs-svg-qa.png"));
console.log(`Rendered ${out}`);
