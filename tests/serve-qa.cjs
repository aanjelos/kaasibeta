// Isolated browser QA origin. /legacy/ serves the pre-migration app from Git;
// / serves the working tree. Both use the same local origin for migration tests.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  let name;
  try {name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400).end();return;}
  const legacy=name.startsWith('/legacy/');
  if(legacy)name=name.slice('/legacy'.length);
  if(name==='/')name='/index.html';
  if(name==='/sw.js'){res.writeHead(404).end();return;} // Avoid stale dev assets; test production SW separately.
  if(!(/^\/(index\.html|style\.css|tailwind\.css|manifest\.json)$/.test(name)||/^\/(js|img|fonts)\/[a-zA-Z0-9_./-]+$/.test(name))||name.split('/').includes('..')){res.writeHead(404).end();return;}
  try{
    const data=legacy?execFileSync('git',['show',`fb6fe2b:${name.slice(1)}`],{cwd:root,maxBuffer:10*1024*1024,windowsHide:true}):fs.readFileSync(path.join(root,name));
    res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  }catch{res.writeHead(404).end();}
}).listen(8766,'127.0.0.1',()=>console.log('QA preview: http://127.0.0.1:8766/ (legacy: /legacy/)'));
