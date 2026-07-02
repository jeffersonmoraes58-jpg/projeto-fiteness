const { execSync } = require('child_process');
const javaDir = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.19.10-hotspot';
try {
  const shortPath = execSync(`for %I in ("${javaDir}") do @echo %~sI`, { shell: 'cmd.exe' }).toString().trim();
  console.log(shortPath);
} catch (e) {
  console.log(javaDir);
}
