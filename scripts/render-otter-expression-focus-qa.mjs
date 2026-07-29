import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root=process.cwd(), pub=path.join(root,"public/character-assets"), base=path.join(pub,"animals/otter/sage-green-hoodie/otter-sage-green-hoodie-base.png"), svg=path.join(pub,"expressions/round-muzzle"), bg=path.join(pub,"approval/golden-retriever-v2/mvp/png/backgrounds/minimal-cream.png"), out=path.join(pub,"animals/otter/qa/round-muzzle");
const specs={
  gentle:{eyes:[398,302,228,104,0],eyebrows:[405,270,214,58,0],mouth:[426,476,170,82,0]},
  bright:{eyes:[398,298,251,114,0],eyebrows:[402,261,220,60,3],mouth:[420,474,190,90,0]},
  chic:{eyes:[402,305,207,94,0],eyebrows:[407,276,210,56,0],mouth:[432,481,158,76,0]},
  confident:{eyes:[398,300,237,108,0],eyebrows:[403,265,218,60,-4],mouth:[424,479,178,84,0]},
  playful:{eyes:[398,298,251,114,0],eyebrows:[401,258,222,62,5],mouth:[432,475,190,88,-6]},
};
const colors={eyes:'#2b1a13',eyebrows:'#3c2015',mouth:'#542a1d'};
async function svgBuffer(expression,part,width,height,rotation){const source=await fs.readFile(path.join(svg,expression,`${part}.svg`),'utf8');const color=colors[part];const materialized=source.replaceAll(`var(--${part === 'eyes' ? 'eye' : part === 'eyebrows' ? 'brow' : 'mouth'}-color)`,color);return sharp(Buffer.from(materialized)).resize(width,height).rotate(rotation,{background:'#00000000'}).png().toBuffer();}
async function render(expression){const {width,height}=await sharp(base).metadata(),s=width/1024,layers=[{input:await sharp(bg).resize(width,height).png().toBuffer()},{input:await sharp(base).png().toBuffer()}];for(const [part,[x,y,w,h,r]] of Object.entries(specs[expression]))layers.push({input:await svgBuffer(expression,part,Math.round(w*s),Math.round(h*s),r),left:Math.round(x*s),top:Math.round(y*s)-108});return sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();}
await fs.mkdir(out,{recursive:true});const parts=[];for(const [i,e] of Object.keys(specs).entries()){const image=await render(e), p=await sharp(image).resize(256).png().toBuffer(), a=await sharp(image).extract({left:350,top:230,width:550,height:450}).resize(220).png().toBuffer();parts.push({input:p,left:i*256,top:0},{input:a,left:i*256+18,top:270});}await sharp({create:{width:1280,height:500,channels:4,background:'#f7f3ea'}}).composite(parts).png().toFile(path.join(out,'otter-expression-focus-qa.png'));
