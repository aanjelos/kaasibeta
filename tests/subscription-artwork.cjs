// Asset maintenance only: remove a known solid app-tile backdrop from its edges.
// Connected removal preserves enclosed light details within the actual brand mark.
const fs=require('node:fs'),path=require('node:path');
const treatments={fansly:{background:24},hulu:{background:0},magnific:{background:0},dialogviu:{background:255},mondaydotcom:{background:255},epidemicsound:{background:255,whiteMark:true}};
async function transparentArtwork(sharp,buffer,id){
  const treatment=treatments[id];if(!treatment)return buffer;
  const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=info,seen=new Uint8Array(width*height),queue=[];
  if(treatment.whiteMark){let alreadyWhite=true;for(let n=0;n<data.length;n+=4)if(data[n+3]>0&&[0,1,2].some(c=>data[n+c]<245)){alreadyWhite=false;break;}if(alreadyWhite)return buffer;}
  const add=(x,y)=>{const p=y*width+x;if(seen[p])return;seen[p]=1;const n=p*4;
    if(data[n+3]<16||[0,1,2].every(c=>Math.abs(data[n+c]-treatment.background)<=48))queue.push(p);
  };
  for(let x=0;x<width;x++){add(x,0);add(x,height-1);}for(let y=0;y<height;y++){add(0,y);add(width-1,y);}
  for(let i=0;i<queue.length;i++){const p=queue[i],x=p%width,y=Math.floor(p/width);data[p*4+3]=0;if(x)add(x-1,y);if(x+1<width)add(x+1,y);if(y)add(x,y-1);if(y+1<height)add(x,y+1);}
  let visible=0;for(let n=0;n<data.length;n+=4)if(data[n+3]>0){visible++;if(treatment.whiteMark)data[n]=data[n+1]=data[n+2]=255;}
  if(!visible)throw new Error(`Backdrop removal erased ${id}; review its artwork.`);
  return sharp(data,{raw:{width,height,channels:4}}).webp({quality:90}).toBuffer();
}
module.exports={transparentArtwork,treatments};
if(require.main===module)(async()=>{
  const sharp=require(process.argv[2]||'sharp'),dir=path.resolve(__dirname,'../img/subscriptions');
  for(const id of Object.keys(treatments)){const file=path.join(dir,id+'.webp'),image=await transparentArtwork(sharp,fs.readFileSync(file),id);fs.writeFileSync(file,image);}
  console.log('Removed reviewed solid backdrops from '+Object.keys(treatments).join(', '));
})().catch(error=>{console.error(error);process.exitCode=1;});
