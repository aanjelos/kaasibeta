// Asset-only maintenance tool. Public artwork is downloaded, rasterized and bundled locally.
// Never runs in the client; page content is parsed as data, never executed.
const fs=require('node:fs'),path=require('node:path');
const {transparentArtwork,treatments}=require('./subscription-artwork.cjs');
const sites={microsoft:'https://www.microsoft.com/',trello:'https://trello.com/',slack:'https://slack.com/',googleworkspace:'https://workspace.google.com/',canva:'https://www.canva.com/',amazonprime:'https://www.primevideo.com/',theguardian:'https://www.theguardian.com/',zoom:'https://www.zoom.com/',zoho:'https://www.zoho.com/',wix:'https://www.wix.com/',woocommerce:'https://woocommerce.com/',bumble:'https://bumble.com/',epidemicsound:'https://www.epidemicsound.com/',flo:'https://flo.health/',iflix:'https://www.iflix.com/',linkedin:'https://www.linkedin.com/',minecraft:'https://www.minecraft.net/',quillbot:'https://quillbot.com/',
  disneyplus:'https://www.disneyplus.com/',hulu:'https://www.hulu.com/',googleone:'https://one.google.com/about/',
  lightroommobile:'https://www.adobe.com/products/photoshop-lightroom/mobile.html',magnific:'https://magnific.com/',
  dialog:'https://www.dialog.lk/',sltmobitel:'https://www.sltmobitel.lk/',peotv:'https://www.slt.lk/en/node/1595',hutch:'https://hutch.lk/',dialogviu:'https://www.dialog.lk/dialog-television/dialog-play-app/package',
  flaticon:'https://www.flaticon.com/',mondaydotcom:'https://monday.com/',microsoftonedrive:'https://www.microsoft.com/en-us/microsoft-365/onedrive/online-cloud-storage',
  eset:'https://www.eset.com/',xbox:'https://www.xbox.com/en-US/xbox-game-pass',nintendoswitch:'https://www.nintendo.com/us/online/',
  googleplaypass:'https://play.google.com/about/play-pass/',myfitnesspal:'https://www.myfitnesspal.com/',lyfta:'https://lyfta.app/',calm:'https://www.calm.com/',
  financialtimes:'https://www.ft.com/',theeconomist:'https://www.economist.com/',reuters:'https://www.reuters.com/',freshbooks:'https://www.freshbooks.com/'};
const dir=path.resolve(__dirname,'../img/subscriptions');
const overrides={nintendoswitch:'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons/nintendoswitch.svg',googleworkspace:'https://www.gstatic.com/images/branding/googleg/2x/googleg_standard_color_128dp.png',disneyplus:'https://static-assets.bamgrid.com/product/disneyplus/favicons/mask-icon-aurora.86b2f302cf50180b25ddd8835041b1c3.svg',iflix:'https://upload.wikimedia.org/wikipedia/commons/7/77/Iflix_vector_logo.svg',linkedin:'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/5.15.4/svgs/brands/linkedin.svg',lightroommobile:'https://www.adobe.com/cc-shared/assets/img/product-icons/svg/lightroom-64.svg',
  hulu:'https://press.hulu.com/wp-content/uploads/sites/34/2024/12/cropped-cropped-favicon.ico_-180x180.png',
  dialogviu:'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/56/14/0a/56140a1a-5d57-31da-7b6c-a452cb880c62/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg',
  peotv:'https://www.slt.lk/sites/default/files/downloads/muliple_downloads/files/logo-block-PeoTV_0.jpg',
  microsoftonedrive:'https://www.microsoft.com/content/dam/microsoft/bade/images/icons/en-us/m365-app-icons-fy26/OneDrive-Icon-FY26.svg',
  lyfta:'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/26/a5/ce/26a5cef9-1445-1b00-f8a8-5bb18ff328d5/ic_lyfta-0-0-1x_U007epad-0-1-0-85-220.png/512x512bb.jpg',
  googleplaypass:'https://www.gstatic.com/android/market_images/web/play_pass_signup_page_logo.png'};
async function get(url){const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Mozilla/5.0 (Kaasi artwork maintenance)'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response;}
function references(html,base){
  const decode=value=>value.replace(/&amp;/g,'&');
  const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(([tag])=>{
    const rel=tag.match(/\brel\s*=\s*["']([^"']+)/i)?.[1]||'',href=tag.match(/\bhref\s*=\s*["']([^"']+)/i)?.[1];
    return href&&/icon/i.test(rel)?{url:new URL(decode(href),base).href,rank:/apple-touch|192|180/i.test(tag)?0:1}:null;
  }).filter(Boolean).sort((a,b)=>a.rank-b.rank).map(row=>row.url);
  const images=[...html.matchAll(/(?:src|href|content)\s*=\s*["']([^"']+(?:\.svg|\.png|\.webp|\.ico)(?:\?[^"']*)?)["']/gi)]
    .map(match=>decode(match[1])).filter(value=>/logo|icon|play.pass|lightroom|lyfta|magnific/i.test(value)).map(value=>new URL(value,base).href);
  return {icons:[...new Set(links)],images:[...new Set(images)].slice(0,25)};
}
async function main(){
  const inspect=process.argv.includes('--inspect'),sharp=inspect?null:require(process.argv[2]||'sharp');
  const only=process.env.KAASI_ICON_IDS?.split(','),items=Object.entries(sites).filter(([id])=>!only||only.includes(id));
  const records=[];let next=0;
  async function worker(){while(next<items.length){const [id,site]=items[next++];let refs={icons:[],images:[]},error;
    try{const response=await get(site);refs=references(await response.text(),response.url);}catch(e){error=e.message;}
    if(inspect){records.push({id,site,...refs,error});continue;}
    // Explicit, reviewed brand artwork must never silently fall back to an unrelated parent-site favicon.
    const candidates=(overrides[id]?[overrides[id]]:[...refs.icons,new URL('/favicon.ico',site).href]).filter(value=>value&&/^https?:\/\//.test(value));let saved=false;
    for(const source of candidates){try{
      const response=await get(source),buffer=Buffer.from(await response.arrayBuffer());if(buffer.length>8*1024*1024)throw new Error('Artwork is too large.');
      const text=buffer.toString('utf8');if(/<svg[\s>]/.test(text)&&/<script|<foreignObject|\son\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i.test(text))throw new Error('Unsafe SVG.');
      const input=id==='nintendoswitch'?Buffer.from(text.replace('<svg ','<svg fill="#E60012" ')):id==='disneyplus'?Buffer.from(text.replace(/fill="#[0-9a-f]+"/gi,'fill="#FFFFFF"')):id==='linkedin'?Buffer.from(text.replace('<svg ','<svg fill="#0A66C2" ')):buffer.subarray(0,4).equals(Buffer.from([0,0,1,0]))?icoImage(buffer):buffer;
      const artwork=()=>input.data?sharp(input.data,{raw:input.raw}):sharp(input);
      const metadata=await artwork().metadata();
      const extract=id==='googleplaypass'?{left:0,top:0,width:48,height:50}:undefined;
      const pipeline=artwork();if(extract)pipeline.extract(extract);
      const image=await transparentArtwork(sharp,await pipeline.resize(96,96,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({quality:90}).toBuffer(),id);
      fs.writeFileSync(path.join(dir,id+'.webp'),image);records.push({id,source,site,file:id+'.webp',library:['lyfta','dialogviu'].includes(id)?'Official App Store listing':'Official website',sourceWidth:metadata.width,sourceHeight:metadata.height,...(extract?{extract}:{}),bytes:image.length});saved=true;break;
    }catch(e){error=e.message;}}
    if(!saved)records.push({id,site,missing:true,error});
  }}
  await Promise.all(Array.from({length:4},worker));
  if(!inspect){const previous=fs.existsSync(path.join(dir,'official-sources.json'))?JSON.parse(fs.readFileSync(path.join(dir,'official-sources.json'),'utf8')):[];
    fs.writeFileSync(path.join(dir,'official-sources.json'),JSON.stringify([...previous.filter(row=>!records.some(record=>record.id===row.id)),...records].sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');}
  console.log(JSON.stringify(records.sort((a,b)=>a.id.localeCompare(b.id))));
}
function icoImage(buffer){
  const count=buffer.readUInt16LE(4),entries=[];for(let i=0;i<count;i++){const offset=6+i*16;if(offset+16>buffer.length)break;
    entries.push({width:buffer[offset]||256,length:buffer.readUInt32LE(offset+8),offset:buffer.readUInt32LE(offset+12)});}
  for(const entry of entries.sort((a,b)=>b.width-a.width)){const image=buffer.subarray(entry.offset,entry.offset+entry.length);if(image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return image;}
  // Windows favicons commonly contain an uncompressed bottom-up BGRA bitmap.
  for(const entry of entries.sort((a,b)=>b.width-a.width)){const image=buffer.subarray(entry.offset,entry.offset+entry.length);
    if(image.length<40||image.readUInt32LE(0)!==40||image.readUInt16LE(14)!==32||image.readUInt32LE(16)!==0)continue;
    const width=image.readInt32LE(4),height=image.readInt32LE(8)/2;
    if(width<1||height<1||width>512||height>512||!Number.isInteger(height)||image.length<40+width*height*4)continue;
    const data=Buffer.alloc(width*height*4);let hasAlpha=false;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const from=40+((height-1-y)*width+x)*4,to=(y*width+x)*4;
      data[to]=image[from+2];data[to+1]=image[from+1];data[to+2]=image[from];data[to+3]=image[from+3];hasAlpha ||= image[from+3]>0;}
    if(!hasAlpha){const start=40+width*height*4,stride=Math.ceil(width/32)*4;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){const mask=image[start+(height-1-y)*stride+(x>>3)]||0;data[(y*width+x)*4+3]=mask&(128>>(x%8))?0:255;}}
    return {data,raw:{width,height,channels:4}};
  }
  throw new Error('ICO contains no supported PNG or BGRA bitmap.');
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={references,icoImage};
