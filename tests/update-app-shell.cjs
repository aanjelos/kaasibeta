// Regenerate the versioned app-shell hashes after editing the page or its assets.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = content => createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
const html = read('index.html');
const version = html.match(/name="application-version" content="([^"]+)"/)?.[1];
if (!version) throw new Error('The page has no application version.');
if (!read('sw.js').includes(`const BUILD = "${version}"`)) throw new Error('The service worker version differs from the page.');

const files = { './index.html': hash(html) };
for (const match of html.matchAll(/(?:src|href)="((?:js\/[^" ]+\.js|[^/" ]+\.css)\?v=[^"]+)"/g)) {
  const asset = match[1];
  if (new URL(asset, 'https://beta.example/').searchParams.get('v') !== version) throw new Error(`Old asset version: ${asset}`);
  files[`./${asset}`] = hash(read(asset.split('?')[0]));
}
fs.writeFileSync(path.join(root, 'app-shell.json'), `${JSON.stringify({ version, files }, null, 2)}\n`);
