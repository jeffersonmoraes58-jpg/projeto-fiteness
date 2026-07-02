const fs = require('fs');
const path = require('path');
const rnPath = require.resolve('react-native/package.json');
const gpPath = require.resolve('@react-native/gradle-plugin/package.json', { paths: [rnPath] });
console.log('Resolved:', gpPath);
console.log('Realpath:', fs.realpathSync(gpPath));
console.log('Exists:', fs.existsSync(gpPath));
