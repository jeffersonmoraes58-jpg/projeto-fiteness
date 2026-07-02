const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const androidDir = path.resolve(__dirname, 'apps/mobile/android');
const javaHome = 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.19.10-hotspot';

// Set environment variables
const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  PATH: `${javaHome}\\bin;${process.env.PATH}`
};

console.log('JAVA_HOME:', javaHome);
console.log('Android dir:', androidDir);

// Run gradle
const gradle = spawn('gradlew.bat', ['clean', 'assembleRelease'], {
  cwd: androidDir,
  env: env,
  shell: true,
  stdio: 'inherit'
});

gradle.on('close', (code) => {
  console.log('Gradle exited with code:', code);
  if (code === 0) {
    // Find the APK
    const apkDir = path.join(androidDir, 'app/build/outputs/apk/release');
    if (fs.existsSync(apkDir)) {
      const files = fs.readdirSync(apkDir);
      const apk = files.find(f => f.endsWith('.apk'));
      if (apk) {
        const apkPath = path.join(apkDir, apk);
        const destPath = path.join('C:\\Users\\jeffe\\OneDrive\\Área de Trabalho', apk);
        fs.copyFileSync(apkPath, destPath);
        console.log('APK copied to:', destPath);
      }
    }
  }
});
