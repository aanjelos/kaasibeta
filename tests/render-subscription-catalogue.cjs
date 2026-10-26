// Development-only contact sheet of the exact bundled assets on the app's dark frame.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context={document:{addEventListener(){}}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/subscription-assets.js'),'utf8')+';this.files=SUBSCRIPTION_LOGO_FILES;',context);
vm.runInContext(fs.readFileSync(path.join(root,'js/subscription-services.js'),'utf8')+';this.services=SubscriptionServices.services;',context);
(async()=>{
  const sharp=require(process.argv[2]||'sharp'),layers=[],labels=[];
  const height=Math.ceil(context.services.length/10)*104;
  const xml=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  for(let i=0;i<context.services.length;i++){
    const service=context.services[i],id=service.logoId,left=i%10*120,top=Math.floor(i/10)*104;
    const file=path.join(root,'img/subscriptions',context.files[id]||id+'.svg');
    const input=file.endsWith('.svg')?Buffer.from(fs.readFileSync(file,'utf8').replace(/(width|height)="1em"/g,'$1="24"')):file;
    layers.push({input:await sharp(input).resize(40,40,{fit:'contain',background:'#00000000'}).png().toBuffer(),left:left+40,top:top+8});
    const words=service.name.split(' '),lines=[''];
    words.forEach(word=>{if(lines[lines.length-1].length+word.length>20)lines.push('');lines[lines.length-1]+=(lines[lines.length-1]?' ':'')+word;});
    lines.forEach((line,index)=>labels.push(`<text x="${left+60}" y="${top+70+index*12}" text-anchor="middle" font-family="Arial" font-size="10" fill="white">${xml(line)}</text>`));
  }
  const destination=path.join(root,'docs/dev screenshots',process.argv[3]||'subscription-dark-audit-v6.412n.png');
  layers.push({input:Buffer.from(`<svg width="1200" height="${height}">${labels.join('')}</svg>`),left:0,top:0});
  await sharp({create:{width:1200,height,channels:4,background:'#323232'}}).composite(layers).png().toFile(destination);
  console.log(JSON.stringify({services:context.services.length,destination}));
})().catch(error=>{console.error(error);process.exitCode=1;});
