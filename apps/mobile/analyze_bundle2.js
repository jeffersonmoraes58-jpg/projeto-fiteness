const fs = require('fs');
const content = fs.readFileSync('c:/Projeto-fiteness/apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle', 'utf8');

// Search for env vars and router-related strings
const terms = [
  'EXPO_ROUTER_APP_ROOT',
  'EXPO_ROUTER_IMPORT_MODE',
  'expo-router/_ctx',
  'require.context',
  'process.env',
  'registerRootComponent',
  'renderRootComponent',
  'AppRegistry.registerComponent',
  'expo-router/entry',
  'main',
  'runApplication'
];

for (const term of terms) {
  const idx = content.indexOf(term);
  if (idx >= 0) {
    console.log('FOUND: "' + term + '" at index:', idx);
    const start = Math.max(278859, idx - 150);
    const end = Math.min(content.length, idx + 200);
    const snippet = content.substring(start, end);
    // Clean up for display
    const clean = snippet.replace(/[^\x20-\x7E\n]/g, '.');
    console.log('Context:', clean);
    console.log('---');
  } else {
    console.log('NOT FOUND: "' + term + '"');
  }
}
