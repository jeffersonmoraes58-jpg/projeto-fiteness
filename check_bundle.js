const fs = require('fs');
const c = fs.readFileSync('c:/Projeto-fiteness/apps/mobile/android/app/build/intermediates/assets/release/index.android.bundle', 'utf8');

// Search for the actual require.context call (not the error message)
const regex = /require\.context\s*\(/g;
let match;
let count = 0;
while ((match = regex.exec(c)) !== null) {
  count++;
  const start = Math.max(0, match.index - 50);
  const end = Math.min(c.length, match.index + 200);
  const snippet = c.substring(start, end);
  // Skip if it's the error message
  if (!snippet.includes('experimental Metro feature')) {
    console.log('Match', count, 'at', match.index);
    console.log('Context:', snippet);
    console.log('---');
  }
}
console.log('Total require.context( calls (excluding error msg):', count);

// Also search for the actual resolved context
const ctxRegex = /ctx\s*=\s*require\.context/g;
let ctxMatch;
while ((ctxMatch = ctxRegex.exec(c)) !== null) {
  console.log('\nctx = require.context found at', ctxMatch.index);
  const start = Math.max(0, ctxMatch.index - 100);
  const end = Math.min(c.length, ctxMatch.index + 300);
  console.log(c.substring(start, end));
}
