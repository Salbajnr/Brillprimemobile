
# BrillPrime Mobile App

This is the React Native mobile application for BrillPrime, sharing backend services with the web application.

## Project Structure

```
mobile/
├── src/
│   ├── screens/          # Mobile screens adapted from web pages
│   ├── components/       # Shared mobile components
│   ├── services/         # API services (connects to main backend)
│   ├── shared/           # Shared types and utilities
│   └── assets/           # Mobile-specific assets
├── android/              # Android-specific files
├── ios/                  # iOS-specific files
└── package.json          # Mobile dependencies
```

## Setup Instructions

1. Install React Native CLI globally:
   ```bash
   npm install -g @react-native-community/cli
   ```

2. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

3. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   npm run ios
   ```

4. For Android:
   ```bash
   npm run android
   ```

## Sharing Code with Web App

- **Backend**: Uses the same API endpoints as the web app
- **Types**: Imports shared types from `../shared/schema.ts`
- **Logic**: Business logic can be adapted from web components
- **Assets**: Some assets can be shared between web and mobile

## Key Features

- Authentication (same as web)
- Order management and tracking
- Real-time features via WebSocket
- Payment integration
- Location services
- Push notifications
- Offline support
