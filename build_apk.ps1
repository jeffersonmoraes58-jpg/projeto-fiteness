# PowerShell script to build APK with proper encoding handling
$ErrorActionPreference = "Stop"

$androidDir = "C:\Projeto-fiteness\apps\mobile\android"
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"

# Set environment
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

Write-Host "JAVA_HOME: $javaHome"
Write-Host "Android dir: $androidDir"

# Change to android directory
Set-Location $androidDir

# Run gradle
Write-Host "Starting build..."
$process = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "clean", "assembleRelease" -NoNewWindow -Wait -PassThru

if ($process.ExitCode -eq 0) {
    Write-Host "Build successful!"
    
    # Find APK
    $apkDir = "app\build\outputs\apk\release"
    if (Test-Path $apkDir) {
        $apk = Get-ChildItem -Path $apkDir -Filter "*.apk" | Select-Object -First 1
        if ($apk) {
            $destPath = "C:\Users\jeffe\OneDrive\Área de Trabalho\$($apk.Name)"
            Copy-Item -Path $apk.FullName -Destination $destPath -Force
            Write-Host "APK copied to: $destPath"
        }
    }
} else {
    Write-Host "Build failed with exit code: $($process.ExitCode)"
    exit $process.ExitCode
}
