
#!/bin/bash
echo "Building BrillPrime Android Debug APK..."
cd "$(dirname "$0")"
./gradlew assembleDebug
echo "Debug APK built successfully!"
echo "Location: android/app/build/outputs/apk/debug/app-debug.apk"
