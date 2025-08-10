
# BrillPrime Mobile App

React Native mobile application for Android and iOS.

## Prerequisites

- Node.js 18+
- React Native CLI: `npm install -g @react-native-community/cli`
- Android Studio (for Android development)
- Xcode 12+ (for iOS development - macOS only)

## Setup Instructions

### 1. Install Dependencies
```bash
cd apps/Mobile
npm install
```

### 2. iOS Setup (macOS only)
```bash
cd ios
pod install
cd ..
```

### 3. Android Setup
1. Open Android Studio
2. Install Android SDK (API level 31+)
3. Create virtual device or connect physical device
4. Enable USB debugging on physical device

### 4. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your actual API keys and configuration
```

### 5. Firebase Setup
1. Create Firebase project at https://console.firebase.google.com
2. Add Android and iOS apps to your Firebase project
3. Download `google-services.json` for Android (place in `android/app/`)
4. Download `GoogleService-Info.plist` for iOS (place in `ios/BrillPrime/`)

### 6. Google Maps Setup
1. Get Google Maps API key from Google Cloud Console
2. Enable Maps SDK for Android and iOS
3. Add API key to `.env` file

## Development

### Run on Android
```bash
npm run android
```

### Run on iOS
```bash
npm run ios
```

### Start Metro Bundler
```bash
npm start
```

## Building for Production

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

## Key Features

- **Cross-platform**: Single codebase for Android and iOS
- **Real-time updates**: WebSocket integration with backend
- **Offline support**: Local storage and sync capabilities
- **Push notifications**: Firebase Cloud Messaging
- **Biometric authentication**: Face ID/Touch ID and fingerprint
- **Location services**: Background location tracking for drivers
- **Maps integration**: Google Maps for delivery tracking
- **Camera integration**: QR code scanning and document upload

## API Integration

The app connects to your BrillPrime backend running on Replit. Update the `API_BASE_URL` in `.env` to match your Replit deployment:

```
API_BASE_URL=https://brillprime-monorepo-<your-username>.replit.app/api
```

## Deployment

### Android (Google Play Store)
1. Generate signed APK/AAB
2. Upload to Google Play Console
3. Configure app details and release

### iOS (App Store)
1. Archive app in Xcode
2. Upload to App Store Connect
3. Configure app metadata and submit for review

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **Android build errors**: Clean project with `cd android && ./gradlew clean`
3. **iOS pod install issues**: Delete `Podfile.lock` and run `pod install` again
4. **Network issues**: Check API_BASE_URL in `.env` file

### Development Tips

- Use React Native Debugger for debugging
- Enable Flipper for advanced debugging
- Test on physical devices for location and camera features
- Use Reactotron for state management debugging
