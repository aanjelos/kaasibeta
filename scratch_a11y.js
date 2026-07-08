const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
let warnings = [];
lines.forEach((line, index) => {
  const l = line.toLowerCase();
  if ((l.includes('<input') || l.includes('<button') || l.includes('<select')) && 
      !l.includes('aria-label') && 
      !l.includes('title=') && 
      !l.includes('type="hidden"') &&
      !l.includes('type="submit"') &&
      !l.includes('type="reset"')) {
      
      if (l.includes('<button') && l.match(/<button[^>]*>[^<]+<\/button>/)) return;
      warnings.push((index + 1) + ': ' + line.trim());
  }
});
console.log(warnings.join('\n'));
