import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public/character-assets");
const catRoot = path.join(assets, "avatar-system/cat/v1");
const basePath = path.join(assets, "animals/russian-blue/navy-cardigan/russian-blue.navy-cardigan-base.v2.png");
const mvpRoot = path.join(assets, "approval/golden-retriever-v2/mvp/png");
const outputRoot = path.join(assets, "animals/russian-blue/qa");
const rig = JSON.parse(await fs.readFile(path.join(catRoot, "face-rigs/russian-blue.navy-cardigan.v1.json"), "utf8"));
const cases = [["gentle","minimal-cream"],["bright","green-park"],["chic","warm-cafe",true],["confident","warm-cafe"],["playful","minimal-cream",false,true]];
const parts = { eyes:{width:240,height:90,center:[120,47]}, eyebrows:{width:220,height:50,center:[110,25]}, noseMouth:{width:140,height:100,center:[70,29]} };
const glasses = { width:280, height:110, center:[140,55] };
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function transform(expression, part) {
  const centerName = part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "noseCenter";
  const center = rig.anchors[centerName], layer = rig.layers[part], override = rig.expressionTransformOverrides?.[expression]?.[part] ?? {};
  const [cx,cy] = parts[part].center, scaleX = layer.scaleX * (override.scaleX ?? 1), scaleY = layer.scaleY * (override.scaleY ?? 1);
  return { x:center.x + layer.offsetX + (override.deltaX ?? 0) - cx * scaleX, y:center.y + layer.offsetY + (override.deltaY ?? 0) - cy * scaleY, scaleX, scaleY, rotation:(layer.rotation ?? 0)+(override.rotation ?? 0) };
}
async function rasterSvg(expression, part, width, height, rotation) {
  const assetPart = part === "noseMouth" ? "nose-mouth" : part;
  const source = await fs.readFile(path.join(catRoot,"expressions",expression,`${assetPart}.svg`),"utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "nose-mouth";
  return sharp(Buffer.from(source.replaceAll(`var(--${variable}-color)`,rig.colors[part]))).resize(width,height).rotate(rotation,{background:"#00000000"}).png().toBuffer();
}
async function circle(input) {
  const mask=Buffer.from('<svg width="64" height="64"><circle cx="32" cy="32" r="32" fill="white"/></svg>');
  return sharp(input).resize(64,64).composite([{input:mask,blend:"dest-in"}]).png().toBuffer();
}
async function composite(expression, background, hasGlasses, hasSparkles) {
  const {width,height}=await sharp(basePath).metadata(), scale=width/1024;
  const layers=[{input:await sharp(path.join(mvpRoot,"backgrounds",`${background}.png`)).resize(width,height).png().toBuffer()},{input:await sharp(basePath).png().toBuffer()}];
  for (const part of Object.keys(parts)) { const p=parts[part], t=transform(expression,part); layers.push({input:await rasterSvg(expression,part,Math.round(p.width*t.scaleX*scale),Math.round(p.height*t.scaleY*scale),t.rotation),left:Math.round(t.x*scale),top:Math.round(t.y*scale)}); }
  if (hasGlasses) { const l=rig.layers.glasses, x=rig.anchors.eyeCenter.x+l.offsetX-glasses.center[0]*l.scaleX, y=rig.anchors.eyeCenter.y+l.offsetY-glasses.center[1]*l.scaleY; layers.push({input:await sharp(path.join(catRoot,"accessories/round-glasses.svg")).resize(Math.round(glasses.width*l.scaleX*scale),Math.round(glasses.height*l.scaleY*scale)).png().toBuffer(),left:Math.round(x*scale),top:Math.round(y*scale)}); }
  if (hasSparkles) layers.push({input:await sharp(path.join(assets,"foreground-effects/original/warm-sparkles-v1.png")).resize(width,height).png().toBuffer()});
  return sharp({create:{width,height,channels:4,background:"#00000000"}}).composite(layers).png().toBuffer();
}

await fs.mkdir(outputRoot,{recursive:true});
const board=[], debug=[], report={ rig, cases:[], assets:{} };
for (const [index,[expression,background,hasGlasses,hasSparkles]] of cases.entries()) {
  const image=await composite(expression,background,hasGlasses,hasSparkles);
  const output=path.join(outputRoot,`${expression}.png`); await fs.writeFile(output,image);
  const square64=await sharp(image).resize(64,64).png().toBuffer(), circle64=await circle(image), one28=await sharp(image).resize(128,128).png().toBuffer();
  const preview256=await sharp(image).resize(256,256).png().toBuffer();
  await Promise.all([
    fs.writeFile(path.join(outputRoot,`${expression}-256.png`),preview256),
    fs.writeFile(path.join(outputRoot,`${expression}-128.png`),one28),
    fs.writeFile(path.join(outputRoot,`${expression}-64-square.png`),square64),
    fs.writeFile(path.join(outputRoot,`${expression}-64-circle.png`),circle64),
  ]);
  board.push({input:preview256,left:index*256,top:0},{input:one28,left:index*256+64,top:266},{input:square64,left:index*256+48,top:404},{input:circle64,left:index*256+144,top:404});
  report.cases.push({expression,background,glasses:Boolean(hasGlasses),sparkles:Boolean(hasSparkles),outputs:{p256:`${expression}-256.png`,p128:`${expression}-128.png`,p64Square:`${expression}-64-square.png`,p64Circle:`${expression}-64-circle.png`}});
  for (const [row,part] of Object.keys(parts).entries()) { const p=parts[part], t=transform(expression,part); const layer=await rasterSvg(expression,part,Math.round(p.width*t.scaleX),Math.round(p.height*t.scaleY),t.rotation); debug.push({input:layer,left:Math.round(index*256+(256-(await sharp(layer).metadata()).width)/2),top:row*120}); }
}
await sharp({create:{width:1280,height:480,channels:4,background:"#f7f3ea"}}).composite(board).png().toFile(path.join(outputRoot,"russian-blue-cat-v1-qa.png"));
await sharp({create:{width:1280,height:360,channels:4,background:"#f7f3ea"}}).composite(debug).png().toFile(path.join(outputRoot,"russian-blue-cat-v1-parts-qa.png"));
const chic=await composite("chic","warm-cafe",true,false); await sharp(chic).resize(512,512).png().toFile(path.join(outputRoot,"russian-blue-chic-glasses-512.png"));
const assetFiles=[]; for (const expression of cases.map(([name])=>name)) for (const part of Object.keys(parts)) assetFiles.push(path.join(catRoot,"expressions",expression,`${part === "noseMouth" ? "nose-mouth" : part}.svg`)); assetFiles.push(path.join(catRoot,"accessories/round-glasses.svg"));
for (const file of assetFiles) report.assets[path.relative(root,file).replaceAll("\\","/")]=sha256(await fs.readFile(file));
const baseMetadata=await sharp(basePath).metadata(); report.base={file:path.relative(root,basePath).replaceAll("\\","/"),dimensions:`${baseMetadata.width}x${baseMetadata.height}`,hasAlpha:baseMetadata.hasAlpha};
await fs.writeFile(path.join(outputRoot,"russian-blue-cat-v1-qa.json"),`${JSON.stringify(report,null,2)}\n`);
const assetRows=Object.entries(report.assets).map(([file,hash])=>`<tr><td><code>${file}</code></td><td><code>${hash}</code></td></tr>`).join("");
const caseSections=report.cases.map((item)=>`<section><h2>${item.expression}${item.glasses ? " + round glasses" : ""}${item.sparkles ? " + warm sparkles" : ""}</h2><div class="previews"><img src="${item.outputs.p256}" alt="${item.expression} 256"><img src="${item.outputs.p128}" alt="${item.expression} 128"><img src="${item.outputs.p64Square}" alt="${item.expression} 64 square"><img class="circle" src="${item.outputs.p64Circle}" alt="${item.expression} 64 circle"></div></section>`).join("\n");
await fs.writeFile(path.join(outputRoot,"russian-blue-cat-v1-qa.html"),`<!doctype html><meta charset="utf-8"><title>Russian Blue · cat v1 QA</title><style>body{font-family:system-ui;background:#f7f3ea;color:#26343b;margin:32px}h1{margin-bottom:8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.previews{display:flex;align-items:center;gap:16px;background:#fff;padding:16px;border-radius:18px}.previews img{width:128px;height:128px;object-fit:contain}.previews img:nth-child(2){width:96px;height:96px}.previews img:nth-child(n+3){width:64px;height:64px}.circle{border-radius:999px}table{border-collapse:collapse;width:100%;background:#fff}td{padding:8px;border-bottom:1px solid #ddd;word-break:break-all}.base{width:256px;height:256px;background:repeating-conic-gradient(#eee 0 25%,#fff 0 50%) 50%/24px 24px}</style><h1>Russian Blue · cat v1 QA</h1><p>Fixed base: <code>${report.base.file}</code> · ${report.base.dimensions} RGBA · alpha=${report.base.hasAlpha}</p><img class="base" src="../navy-cardigan/russian-blue.navy-cardigan-base.v2.png" alt="Transparent Russian Blue v2 fixed base"><div class="grid">${caseSections}</div><h2>Independent expression layers: eyes / eyebrows / nose-mouth</h2><img src="russian-blue-cat-v1-parts-qa.png" style="max-width:100%" alt="eyes eyebrows nose-mouth debug"><h2>Chic + round glasses (512px)</h2><img src="russian-blue-chic-glasses-512.png" width="512" height="512" alt="chic with glasses"><h2>Shared cat v1 SVG paths and SHA-256</h2><table>${assetRows}</table><h2>FaceRig</h2><pre>${JSON.stringify(rig,null,2)}</pre>`);
console.log(JSON.stringify({outputRoot,reportPath:path.join(outputRoot,"russian-blue-cat-v1-qa.json"),base:report.base},null,2));
