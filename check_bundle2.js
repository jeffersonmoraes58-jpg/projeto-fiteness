const fs = require('fs');
const c = fs.readFileSync('c:/Projeto-fiteness/apps/mobile/android/app/build/intermediates/assets/release/index.android.bundle', 'utf8');

// Check for common error patterns
const patterns = [
  'Module not found',
  'Cannot find module',
  'undefined is not',
  'null is not',
  'Cannot read property',
  'Cannot read properties',
  'TypeError',
  'SyntaxError',
  'ReferenceError',
  'require.context is not',
  'unstable_allowRequireContext',
  'EXPO_ROUTER_APP_ROOT',
  'process.env',
];

for (const pattern of patterns) {
  const idx = c.indexOf(pattern);
  if (idx >= 0) {
    console.log(`Found "${pattern}" at`, idx);
    const start = Math.max(0, idx - 100);
    const end = Math.min(c.length, idx + 200);
    console.log('Context:', c.substring(start, end));
    console.log('---');
  } else {
    console.log(`NOT found: "${pattern}"`);
  }
}

// Check bundle size and structure
console.log('\nBundle size:', (c.length / 1024 / 1024).toFixed(2), 'MB');
console.log('First 50 bytes hex:', Buffer.from(c.substring(0, 50)).toString('hex'));
console.log('Has Hermes magic number:', c.charCodeAt(0) === 0x1f && c.charCodeAt(1) === 0xbc);
