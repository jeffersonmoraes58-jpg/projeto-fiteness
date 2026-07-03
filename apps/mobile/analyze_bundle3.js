const fs = require('fs');
const content = fs.readFileSync('c:/Projeto-fiteness/apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle', 'utf8');

// Check if the bundle has the Hermes bytecode magic number
const buf = Buffer.from(content, 'utf8');
console.log('First 4 bytes (hex):', buf.slice(0, 4).toString('hex'));
console.log('First 4 bytes (string):', content.substring(0, 4));

// Check if there's readable JS after the binary header
// Look for common JS patterns
const patterns = [
  '__d(',    // Metro define function
  '__r(',    // Metro require function
  'function(', 
  'require(',
  'module.exports',
  'exports.',
  '"main"',
  "'main'",
  'registerRootComponent',
  'AppRegistry'
];

for (const p of patterns) {
  const idx = content.indexOf(p);
  if (idx >= 0) {
    console.log('Pattern "' + p + '" found at index:', idx, '- readable:', idx >= 278859);
  } else {
    console.log('Pattern "' + p + '" NOT FOUND');
  }
}

// Check total size and readable portion
console.log('\nTotal file size:', content.length, 'bytes');
console.log('Readable JS starts at ~278859 bytes');
console.log('Readable portion size:', content.length - 278859, 'bytes');

// Check if the bundle ends with sourcemap comment
const last100 = content.substring(content.length - 100);
console.log('\nLast 100 chars:', last100.replace(/[^\x20-\x7E]/g, '.'));
