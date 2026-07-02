@echo off
cd /d C:\Projeto-fiteness\apps\mobile\android
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
set "PATH=C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot\bin;%PATH%"
echo JAVA_HOME=%JAVA_HOME%
java -version
echo Starting clean build...
call gradlew.bat clean assembleRelease
echo Done!
