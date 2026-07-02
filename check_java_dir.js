const fs = require('fs');
const path = require('path');

const dir = 'C:\\Program Files\\Eclipse Adoptium';
const items = fs.readdirSync(dir);
for (const item of items) {
  const fullPath = path.join(dir, item);
  const stat = fs.statSync(fullPath);
  console.log(item, stat.isDirectory() ? '(dir)' : '(file)');
  if (stat.isDirectory()) {
    // Check if java.exe exists
    const javaPath = path.join(fullPath, 'bin', 'java.exe');
    console.log('  java.exe exists:', fs.existsSync(javaPath));
  }
}
