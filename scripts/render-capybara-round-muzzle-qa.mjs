import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const assets = path.join(root, "public/character-assets");
const base = path.join(assets, "animals/capybara/sage-cardigan/capybara-sage-cardigan-base.png");
const expressions = path.join(assets, "expressions/round-muzzle");
const mvp = path.join(assets, "approval/golden-retriever-v2/mvp/png");
const output = path.join(assets, "animals/capybara/qa");
const rig = JSON.parse(await fs.readFile(path.join(assets, "avatar-system/round-muzzle/v1/face-rigs/capybara.v1.json"), "utf8"));
const cases = [["gentle","minimal-cream"],["bright","green-park"],["chic","warm-cafe",true],["confident","warm-cafe"],["playful","minimal-cream",false,true]];
const sizes = { eyes:[224,100], eyebrows:[224,60], mouth:[128,70] };
const centers = { eyes:[111.5,49.5], eyebrows:[109.5,24.5], mouth:[63.5,29.5], glasses:[511.5,413.5] };

function transform(expression, part) {
  const centerName = part === "eyes" ? "eyeCenter" : part === "eyebrows" ? "browCenter" : "mouthCenter";
  const center = rig.anchors[centerName], layer = rig.layers[part], override = rig.expressionTransformOverrides?.[expression]?.[part] ?? {};
  const [cx, cy] = centers[part], scaleX = layer.scaleX * (override.scaleX ?? 1), scaleY = layer.scaleY * (override.scaleY ?? 1);
  return { x:center.x + layer.offsetX + (override.deltaX ?? 0) - cx * scaleX, y:center.y + layer.offsetY + (override.deltaY ?? 0) - cy * scaleY, scaleX, scaleY, rotation:(layer.rotation ?? 0) + (override.rotation ?? 0) };
}
async function expressionLayer(expression, part, width, height, rotation) {
  const svg = await fs.readFile(path.join(expressions, expression, `${part}.svg`), "utf8");
  const variable = part === "eyes" ? "eye" : part === "eyebrows" ? "brow" : "mouth";
  return sharp(Buffer.from(svg.replaceAll(`var(--${variable}-color)`, rig.colors[part]))).resize(width,height).rotate(rotation,{background:"#00000000"}).png().toBuffer();
}
async function fullLayer(input, width, height, x, y, scaleX, scaleY) {
  const scaled = await sharp(input).resize(Math.round(width*scaleX),Math.round(height*scaleY)).png().toBuffer();
  return sharp({create:{width,height,channels:4,background:"#00000000"}}).composite([{input:scaled,left:Math.round(x),top:Math.round(y)}]).png().toBuffer();
}

await fs.mkdir(output,{recursive:true});
const {width,height} = await sharp(base).metadata(), scale = width / 1024, board = [], small = [];
for (const [index,[expression,background,glasses,sparkles]] of cases.entries()) {
  const layers=[{input:await sharp(path.join(mvp,"backgrounds",`${background}.png`)).resize(width,height).png().toBuffer()},{input:await sharp(base).png().toBuffer()}];
  for (const part of Object.keys(sizes)) { const [w,h]=sizes[part], t=transform(expression,part); layers.push({input:await expressionLayer(expression,part,Math.round(w*t.scaleX*scale),Math.round(h*t.scaleY*scale),t.rotation),left:Math.round(t.x*scale),top:Math.round(t.y*scale)}); }
  if (glasses) { const g=rig.layers.glasses, x=rig.anchors.eyeCenter.x+g.offsetX-centers.glasses[0]*g.scaleX, y=rig.anchors.eyeCenter.y+g.offsetY-centers.glasses[1]*g.scaleY; layers.push({input:await fullLayer(path.join(mvp,"accessories/round-glasses.png"),width,height,x*scale,y*scale,g.scaleX,g.scaleY)}); }
  if (sparkles) layers.push({input:await sharp(path.join(assets,"foreground-effects/original/warm-sparkles-v1.png")).resize(width,height).png().toBuffer()});
  const image=await sharp({create:{width,height,channels:4,background:"#00000000"}}).composite(layers).png().toBuffer();
  await fs.writeFile(path.join(output,`${expression}.png`),image);
  board.push({input:await sharp(image).resize(256,256).png().toBuffer(),left:index*256,top:0},{input:await sharp(image).resize(64,64).png().toBuffer(),left:index*256+96,top:270});
  small.push({input:await sharp(image).resize(64,64).png().toBuffer(),left:index*64,top:0});
}
await sharp({create:{width:1280,height:340,channels:4,background:"#f7f3ea"}}).composite(board).png().toFile(path.join(output,"capybara-round-muzzle-qa.png"));
await sharp({create:{width:320,height:64,channels:4,background:"#f7f3ea"}}).composite(small).png().toFile(path.join(output,"capybara-expression-64-qa.png"));
console.log(`Rendered Capybara QA at ${output}`);
