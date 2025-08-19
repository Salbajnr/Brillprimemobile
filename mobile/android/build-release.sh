
#!/bin/bash
echo "Building BrillPrime Android Release APK..."
cd "$(dirname "$0")"
./gradlew assembleRelease
echo "Release APK built successfully!"
echo "Location: android/app/build/outputs/apk/release/app-release.apk"
