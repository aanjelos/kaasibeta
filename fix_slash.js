const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\/ aria-label="([^"]+)"/g, 'aria-label="$1" /');
fs.writeFileSync('index.html', html);
console.log('Fixed slash formatting.');
