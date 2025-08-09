# BrillPrime Native Setup

This directory contains the React Native mobile application for BrillPrime, a comprehensive financial services platform.

## Project Structure

```
native-setup/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── store/             # Redux store and slices
│   ├── services/          # API services and utilities
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── babel.config.js        # Babel configuration
├── metro.config.js        # Metro bundler configuration
├── react-native.config.js # React Native configuration
└── package.json          # Dependencies and scripts
```

## Features

### Core Features
- **Multi-role Authentication** - Support for Consumer, Merchant, and Driver roles
- **Digital Wallet** - Secure wallet with balance management
- **Real-time Chat** - Customer-to-merchant and customer-to-driver communication
- **Order Management** - Complete order lifecycle tracking
- **Location Services** - GPS tracking and location-based features
- **Push Notifications** - Real-time updates and alerts
- **QR Code Integration** - Payment and order confirmation via QR codes

### State Management
- **Redux Toolkit** - Modern Redux with RTK
- **Redux Persist** - Offline data persistence
- **Async Storage** - Secure local storage for React Native

### Navigation
- **React Navigation v6** - Tab and stack navigation
- **Role-based Navigation** - Different flows for different user roles
- **Deep Linking** - Support for deep links and notifications

## Dependencies

### Core Dependencies
- `react-native`: ^0.73.2
- `@react-navigation/native`: ^6.1.9
- `@reduxjs/toolkit`: ^2.0.1
- `react-redux`: ^9.0.4
- `redux-persist`: Latest

### Native Dependencies
- `react-native-screens`: ^3.27.0
- `react-native-safe-area-context`: ^4.8.2
- `react-native-gesture-handler`: ^2.14.1
- `@react-native-async-storage/async-storage`: ^1.21.0

### Additional Features
- `react-native-maps`: Location and mapping
- `react-native-qrcode-scanner`: QR code functionality
- `react-native-biometrics`: Biometric authentication
- `@react-native-firebase/app`: Firebase integration
- `react-native-paystack-webview`: Payment processing

## Development Setup

### Prerequisites
- Node.js 18+
- React Native CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Installation

1. **Install React Native CLI globally**
   ```bash
   npm install -g @react-native-community/cli
   ```

2. **Install dependencies**
   ```bash
   cd native-setup
   npm install
   ```

3. **iOS Setup (macOS only)**
   ```bash
   cd ios
   pod install
   cd ..
   ```

4. **Start Metro bundler**
   ```bash
   npm start
   ```

5. **Run on Android**
   ```bash
   npm run android
   ```

6. **Run on iOS**
   ```bash
   npm run ios
   ```

## Configuration

### Environment Setup
Create environment-specific configuration for:
- API endpoints
- Firebase configuration
- Payment gateway keys
- Maps API keys

### Permissions
The app requires the following permissions:
- Location access (for delivery tracking)
- Camera access (for QR code scanning)
- Storage access (for file uploads)
- Biometric access (for secure authentication)

## Architecture

### State Management Structure
```
store/
├── index.ts              # Store configuration
└── slices/
    ├── authSlice.ts      # Authentication state
    ├── userSlice.ts      # User profile data
    ├── walletSlice.ts    # Wallet and transactions
    ├── ordersSlice.ts    # Order management
    ├── chatSlice.ts      # Chat and messaging
    ├── locationSlice.ts  # Location services
    └── appSlice.ts       # App-wide settings
```

### Screen Organization
- **Auth Screens**: Onboarding, login, registration, role selection
- **Main Screens**: Home, dashboard, profile, cart
- **Feature Screens**: Order history, notifications, settings
- **Role-specific Screens**: Merchant dashboard, driver interface

### API Integration
The app connects to the BrillPrime backend API running on the main server. All API calls are handled through the `services/api.ts` service layer.

## Building for Production

### Android
```bash
npm run build:android
```

### iOS
```bash
npm run build:ios
```

## Testing

The project includes testing setup with:
- Jest for unit testing
- React Native Testing Library
- Detox for E2E testing

Run tests:
```bash
npm test
```

## Deployment

The app can be deployed to:
- Google Play Store (Android)
- Apple App Store (iOS)
- Enterprise distribution

Follow the respective platform guidelines for app store submissions.

## Troubleshooting

### Common Issues
1. **Metro bundler issues**: Clear cache with `npx react-native start --reset-cache`
2. **iOS build issues**: Clean and rebuild with `xcodebuild clean`
3. **Android build issues**: Clean gradle with `cd android && ./gradlew clean`

### Performance Optimization
- Use Flipper for debugging
- Enable Hermes JavaScript engine
- Optimize images and assets
- Implement proper list virtualization

## Contributing

When contributing to the native app:
1. Follow React Native best practices
2. Maintain TypeScript strict mode
3. Add proper error handling
4. Include unit tests for new features
5. Update this documentation as needed