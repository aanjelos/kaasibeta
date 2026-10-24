// Development-only analysis of bundled artwork; never shipped or run in the app.
const fs=require('node:fs'),path=require('node:path');
const frames={dark:[50,50,50],light:[244,244,245]};
function luminance(rgb){return rgb.map(value=>{const n=value/255;return n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[0.2126,0.7152,0.0722][i],0);}
function chooseFrame(pixels){
  const scores={dark:0,light:0};let weight=0;
  for(let i=0;i<pixels.length;i+=4){const alpha=pixels[i+3]/255;if(alpha<0.1)continue;weight+=alpha;
    for(const [name,bg] of Object.entries(frames)){
      const foreground=luminance(bg.map((value,c)=>pixels[i+c]*alpha+value*(1-alpha))),background=luminance(bg);
      scores[name]+=Math.log((Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05))*alpha;
    }
  }
  return {frame:scores.light>scores.dark?'light':'dark',scores:weight?Object.fromEntries(Object.entries(scores).map(([key,value])=>[key,Number(Math.exp(value/weight).toFixed(2))])):scores};
}
module.exports={chooseFrame};
if(require.main===module)(async()=>{
  const sharp=require(process.argv[2]||'sharp'),dir=path.join(__dirname,'../img/subscriptions'),light=[],results={};
  for(const file of fs.readdirSync(dir).filter(name=>/\.(svg|webp)$/.test(name))){
    const data=await sharp(path.join(dir,file)).resize(48,48,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer();
    const result=chooseFrame(data),id=path.parse(file).name;results[id]=result;if(result.frame==='light')light.push(id);
  }
  console.log(JSON.stringify({light,results}));
})().catch(error=>{console.error(error);process.exitCode=1;});
