const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto,createHash}=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const hash=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
test('release manifest covers every local script/style with current normalized hashes',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'app-shell.json'),'utf8'));
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(source.includes(`const BUILD = "${manifest.version}"`));
  assert.ok(html.includes(`name="application-version" content="${manifest.version}"`));
  for(const [file,expected] of Object.entries(manifest.files))assert.equal(hash(fs.readFileSync(path.join(root,file.split('?')[0]),'utf8')),expected,`Refresh app-shell.json after changing ${file}`);
  for(const match of html.matchAll(/(?:src|href)="((?:js\/[^" ]+\.js|[^/" ]+\.css)\?v=[^"]+)"/g)){
    assert.ok(manifest.files['./'+match[1]],match[1]);assert.equal(new URL(match[1],'https://beta.example/').searchParams.get('v'),manifest.version);
  }
});
function fixture(){
  const handlers=new Map(),stores=new Map(),calls=[];let release='v6.435n',broken=false,offline=false;
  const bodies={'./index.html':'new shell','./js/app.js?v=v6.435n':'new script'};
  const manifest=()=>({version:release,files:Object.fromEntries(Object.entries(bodies).map(([k,v])=>[k,hash(v)]))});
  const key=value=>new URL(typeof value==='string'?value:value.url,'https://beta.example/').href;
  const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async match(k){return map.get(key(k))?.clone();},async put(k,v){map.set(key(k),v.clone());},async addAll(){}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
  const context=vm.createContext({URL,Response,Headers,TextEncoder,AbortController,crypto:webcrypto,setTimeout,clearTimeout,console,caches,
    self:{registration:{scope:'https://beta.example/'},location:{origin:'https://beta.example'},addEventListener:(k,v)=>handlers.set(k,v),skipWaiting(){}},
    async fetch(url,options){calls.push({url:String(url),options});if(offline)throw Error('offline');const p=new URL(url,'https://beta.example/');if(p.pathname==='/app-shell.json')return new Response(JSON.stringify(manifest()));const item='./'+p.pathname.slice(1)+p.search;return new Response(broken&&item.includes('app.js')?'wrong build':bodies[item]||'',{status: bodies[item]?200:404});}});
  vm.runInContext(source,context);
  return {context,handlers,caches,calls,set broken(v){broken=v;},set offline(v){offline=v;},manifest};
}
test('normal refresh checks only manifest when unchanged and offline refresh reuses complete shell',async()=>{
  const f=fixture();assert.equal(await (await f.context.navigationShell()).text(),'new shell');
  f.calls.length=0;assert.equal(await (await f.context.navigationShell()).text(),'new shell');assert.equal(f.calls.length,1);assert.ok(f.calls[0].url.endsWith('app-shell.json'));assert.equal(f.calls[0].options.cache,'no-store');
  f.offline=true;assert.equal(await (await f.context.navigationShell()).text(),'new shell');
});
test('mixed or incomplete deployment never replaces the previous working navigation shell',async()=>{
  const f=fixture(),nav=await f.caches.open('kaasi-shell-navigation');await nav.put('./index.html',new Response('previous shell'));f.broken=true;
  assert.equal(await (await f.context.navigationShell()).text(),'previous shell');
  assert.equal(await (await nav.match('./index.html')).text(),'previous shell');
  const cache=await f.caches.open('kaasi-cache-v6.435n');assert.equal(await cache.match('./app-shell.json'),undefined);
  f.broken=false;assert.equal(await (await f.context.navigationShell()).text(),'new shell');
});
test('old document requests use their own cached build and never fetch current code under old queries',async()=>{
  const f=fixture(),cache=await f.caches.open('kaasi-cache-v6.434n');await cache.put('./js/app.js?v=v6.434n',new Response('old code'));
  async function request(url){let result;f.handlers.get('fetch')({request:{method:'GET',url,destination:'script'},respondWith:p=>{result=p;}});return result;}
  assert.equal(await (await request('https://beta.example/js/app.js?v=v6.434n')).text(),'old code');
  assert.equal((await request('https://beta.example/js/missing.js?v=v6.434n')).type,'error');assert.equal(f.calls.length,0);
});
test('activation retains the shell referenced by offline navigation through several pending releases',async()=>{
  const f=fixture();
  await f.caches.open('kaasi-cache-v6.431n');await f.caches.open('kaasi-cache-v6.432n');await f.caches.open('kaasi-cache-v6.434n');await f.caches.open('kaasi-cache-v6.435n');
  const nav=await f.caches.open('kaasi-shell-navigation');await nav.put('./app-shell.json',new Response(JSON.stringify({version:'v6.432n'})));
  let done;f.handlers.get('activate')({waitUntil:p=>done=p});await done;
  const names=await f.caches.keys();assert.ok(names.includes('kaasi-cache-v6.432n'));assert.ok(names.includes('kaasi-cache-v6.435n'));assert.ok(!names.includes('kaasi-cache-v6.431n'));
});
