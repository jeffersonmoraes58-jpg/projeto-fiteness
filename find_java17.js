const fs = require('fs');
const path = require('path');

const dirs = [
  'C:\\Program Files\\Eclipse Adoptium',
  'C:\\Program Files\\Java',
  'C:\\Program Files (x86)\\Java',
  'C:\\Program Files (x86)\\Eclipse Adoptium'
];

for (const dir of dirs) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (item.startsWith('jdk-17') || item.startsWith('jdk17')) {
        console.log('Found:', fullPath);
        console.log('Java:', path.join(fullPath, 'bin', 'java.exe'));
      }
    }
  } catch (e) {
    // ignore
  }
}

// Also check PATH
const { execSync } = require('child_process');
try {
  const result = execSync('where java', { shell: 'cmd.exe' }).toString();
  console.log('Java locations:', result);
} catch (e) {
  console.log('No java found in PATH');
}
