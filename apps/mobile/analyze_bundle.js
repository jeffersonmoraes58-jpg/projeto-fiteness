const fs = require('fs');
const content = fs.readFileSync('c:/Projeto-fiteness/apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle', 'utf8');

const searchTerms = ['expo-router/entry', 'registerComponent', 'mainComponent', 'AppRegistry'];
for (const term of searchTerms) {
  const idx = content.indexOf(term);
  if (idx >= 0) {
    console.log('Found "' + term + '" at index:', idx);
    const start = Math.max(0, idx - 200);
    const end = Math.min(content.length, idx + 300);
    console.log('Context:', content.substring(start, end));
    console.log('---');
  } else {
    console.log('NOT FOUND: "' + term + '"');
  }
}

// Also check the first 1000 readable chars
console.log('\n\n=== First 500 readable chars ===');
let readable = '';
for (let i = 0; i < content.length && readable.length < 500; i++) {
  const c = content.charCodeAt(i);
  if (c >= 32 && c <= 126) {
    readable += content[i];
  } else if (readable.length > 0 && c === 10) {
    readable += '\n';
  }
}
console.log(readable);
