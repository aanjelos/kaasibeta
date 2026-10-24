// Asset-only downloader. Run deliberately when updating the bundled catalogue.
// Never run on a user's device. Remote SVGs are data, not executable scripts.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const c={document:{addEventListener(){}}};vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(root,'js/subscription-services.js'),'utf8')+';this.services=SubscriptionServices.services;',c);
(async()=>{
  const dir=path.join(root,'img/subscriptions');fs.mkdirSync(dir,{recursive:true});
  const meta=await fetch('https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json').then(r=>r.json());
  const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\+/g,'plus').replace(/\./g,'dot').replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
  const services=[...new Map(c.services.map(service=>[service.logoId,{...service,id:service.logoId}])).values()];
  const sources=[];let index=0;
  async function worker(){while(index<services.length){const service=services[index++];
    let url=`https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/${service.id}.svg`;
    let response=await fetch(url),kind='Simple Icons';
    if(!response.ok){url=`https://cdn.jsdelivr.net/npm/simple-icons@14.15.0/icons/${service.id}.svg`;response=await fetch(url);kind='Simple Icons';}
    if(!response.ok){url=`https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons/${({openai:'openai',googlegemini:'gemini',googleworkspace:'google',amazonprime:'primevideo',microsoftonedrive:'onedrive'})[service.id]||service.id}.svg`;response=await fetch(url);kind='Lobe Icons';}
    if(!response.ok && service.id==='pickmepass'){
      const page=await fetch('https://pickme.lk/').then(r=>r.text());
      const candidates=[...page.matchAll(/(?:src|href)=["']([^"']+\.svg(?:\?[^"']*)?)["']/gi)].map(match=>match[1]);
      const asset=candidates.find(value=>/logo|pickme/i.test(value));
      if(asset){url=new URL(asset,'https://pickme.lk/').href;response=await fetch(url);kind='PickMe official website';}
    }
    if(!response.ok && service.id.startsWith('adobe')){url='https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.15.4/svgs/brands/adobe.svg';response=await fetch(url);kind='Font Awesome';}
    if(!response.ok){sources.push({...service,available:false});continue;}
    let svg=await response.text();
    if(!/<svg[\s>]/.test(svg)||/<script|<foreignObject|\son\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i.test(svg)){sources.push({...service,available:false});continue;}
    const entry=meta.find(row=>slug(row.title)===service.id);
    if(kind==='Simple Icons'||kind==='Font Awesome')svg=svg.replace('<svg ',`<svg fill="#${kind==='Font Awesome'?'FF0000':entry?.hex==='000000'?'FFFFFF':entry?.hex||'FFFFFF'}" `);
    svg=svg.replace(/fill=["'](?:#000(?:000)?|black)["']/gi,'fill="#FFFFFF"').replace(/>\s+</g,'><').trim();fs.writeFileSync(path.join(dir,service.id+'.svg'),svg);
    sources.push({id:service.id,name:service.name,source:url,brandSource:entry?.source,license:entry?.license,library:kind,bytes:Buffer.byteLength(svg)});
  }}
  await Promise.all(Array.from({length:6},worker));
  fs.writeFileSync(path.join(dir,'sources.json'),JSON.stringify(sources.sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');
  for(const [name,url] of [['SIMPLE_ICONS_LICENSE.txt','https://raw.githubusercontent.com/simple-icons/simple-icons/develop/LICENSE.md'],['SIMPLE_ICONS_DISCLAIMER.txt','https://raw.githubusercontent.com/simple-icons/simple-icons/develop/DISCLAIMER.md'],['LOBE_ICONS_LICENSE.txt','https://raw.githubusercontent.com/lobehub/lobe-icons/master/LICENSE'],['FONT_AWESOME_LICENSE.txt','https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.15.4/LICENSE.txt']]){const r=await fetch(url);if(r.ok)fs.writeFileSync(path.join(dir,name),await r.text());}
  console.log(JSON.stringify({available:sources.filter(s=>s.bytes).length,missing:sources.filter(s=>!s.bytes).map(s=>s.name),bytes:sources.reduce((n,s)=>n+(s.bytes||0),0)}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
