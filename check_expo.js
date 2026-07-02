const path = require('path');
const fs = require('fs');
const p = require.resolve('expo/package.json');
console.log('Path:', p);
const resolved = path.resolve(path.dirname(p), '../scripts/autolinking.gradle');
console.log('Resolved:', resolved);
console.log('Exists:', fs.existsSync(resolved));

// Also check what the original code does
const original = new File(p, '../scripts/autolinking.gradle');
console.log('Original File:', original);
