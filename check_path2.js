console.log(require.resolve('react-native/package.json'));
console.log(require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] }));
