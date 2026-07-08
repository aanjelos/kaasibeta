const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Regex to find <input ...> or <select ...> or <textarea ...>
const tagRegex = /<(input|select|textarea)([^>]+)>/gi;

let count = 0;
html = html.replace(tagRegex, (match, tag, attrs) => {
    // skip if it already has aria-label, title, id="", or is hidden
    if (attrs.includes('aria-label') || attrs.includes('title=') || attrs.includes('type="hidden"')) {
        return match;
    }
    
    // Extract id or placeholder or name to use as label
    let labelText = "Form field";
    
    const placeholderMatch = attrs.match(/placeholder="([^"]+)"/i);
    const idMatch = attrs.match(/id="([^"]+)"/i);
    const nameMatch = attrs.match(/name="([^"]+)"/i);
    const typeMatch = attrs.match(/type="([^"]+)"/i);
    
    if (placeholderMatch) {
        labelText = placeholderMatch[1];
    } else if (idMatch) {
        // Convert camelCase id to sentence case
        labelText = idMatch[1].replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    } else if (nameMatch) {
        labelText = nameMatch[1];
    } else if (typeMatch) {
        labelText = typeMatch[1] + ' input';
    }
    
    count++;
    return `<${tag}${attrs} aria-label="${labelText}">`;
});

fs.writeFileSync('index.html', html);
console.log(`Added aria-label to ${count} form elements.`);
