const fs = require('fs');
const path = require('path');

const jsDir = 'b:/AntiGravity/kaasibeta/js';
const rootDir = 'b:/AntiGravity/kaasibeta';

const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => path.join(jsDir, f));
const allFiles = [...jsFiles, path.join(rootDir, 'index.html')];

const allContent = allFiles.map(f => ({ name: f, content: fs.readFileSync(f, 'utf-8') }));

let functionDeclarations = [];

const funcRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const arrowFuncRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g;
const assignFuncRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function/g;

allContent.forEach(({ name, content }) => {
    if (name.endsWith('.js')) {
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            functionDeclarations.push({ name: match[1], file: name });
        }
        while ((match = arrowFuncRegex.exec(content)) !== null) {
            functionDeclarations.push({ name: match[1], file: name });
        }
        while ((match = assignFuncRegex.exec(content)) !== null) {
            functionDeclarations.push({ name: match[1], file: name });
        }
    }
});

console.log(`Found ${functionDeclarations.length} function declarations.`);

const uniqueFuncs = [];
const seen = new Set();
for (const f of functionDeclarations) {
    if (!seen.has(f.name)) {
        seen.add(f.name);
        uniqueFuncs.push(f);
    }
}

const unusedFuncs = [];

for (const func of uniqueFuncs) {
    const wordRegex = new RegExp(`\\b${func.name}\\b`, 'g');
    let totalOccurrences = 0;
    allContent.forEach(({ content }) => {
        const matches = content.match(wordRegex);
        if (matches) {
            totalOccurrences += matches.length;
        }
    });

    if (totalOccurrences <= 1) {
        unusedFuncs.push(func);
    }
}

console.log(`Found ${unusedFuncs.length} potentially unused functions:`);
unusedFuncs.forEach(f => console.log(`${path.basename(f.file)}: ${f.name}`));
