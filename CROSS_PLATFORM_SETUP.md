# Cross-Platform Monorepo Setup

This project is now configured as a comprehensive cross-platform monorepo that supports iOS, Android, and Web applications with shared business logic, API calls, hooks, and constants.

## Architecture Overview

```
brillprime-monorepo/
├── apps/
│   ├── web/                    # Vite + React web application
│   └── Mobile/                 # React Native mobile application
├── packages/
│   ├── shared/                 # Cross-platform utilities and platform detection
│   ├── shared-ui/              # React Native Web compatible UI components
│   ├── business-logic/         # Shared hooks and business logic
│   ├── api-client/             # API client for all platforms
│   └── constants/              # Shared constants and configuration
└── server/                     # Backend API server
```

## Shared Packages

### 1. @packages/shared
Cross-platform utilities that work on both React and React Native:

- **Platform Detection**: Detect web vs native environment
- **Storage**: Unified storage API (localStorage on web, AsyncStorage on native)
- **Navigation**: Cross-platform navigation utilities
- **Validation**: Email, password, phone number validation
- **Formatters**: Currency, date, time formatting
- **Utilities**: ID generation, debounce, throttle, deep clone, etc.

### 2. @packages/shared-ui
React Native Web compatible UI components:

- **Button**: Cross-platform button with onPress/onClick support
- **Card**: Container component with consistent styling
- **Badge**: Status and category indicators
- **Text**: Typography component with React Native compatibility
- **View**: Container component with flexbox support

### 3. @packages/business-logic
Shared business logic and hooks:

- **useMonorepoStats**: Hook for fetching and managing monorepo statistics
- **Build utilities**: Functions for formatting build times and calculating coverage

### 4. @packages/api-client
Unified API client for all platforms:

- **ApiClient**: HTTP client with timeout, error handling, and retry logic
- **Type definitions**: Shared API response types
- **Cross-platform compatibility**: Works with fetch API on both web and React Native

### 5. @packages/constants
Shared configuration and constants:

- **Colors**: Brand colors and theme definitions
- **App Config**: Environment-specific configuration
- **Build constants**: Package types and build statuses

## Platform Configuration

### Web Application (Vite)

**Location**: `apps/web/vite.config.ts`

```typescript
alias: {
  '@shared': path.resolve(__dirname, '../../packages/shared/src'),
  '@shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
  '@business-logic': path.resolve(__dirname, '../../packages/business-logic/src'),
  '@api-client': path.resolve(__dirname, '../../packages/api-client/src'),
  '@constants': path.resolve(__dirname, '../../packages/constants/src'),
}
```

### React Native Application (Metro)

**Location**: `apps/Mobile/metro.config.js`

```javascript
resolver: {
  alias: {
    '@shared': path.resolve(monorepoRoot, 'packages/shared/src'),
    '@shared-ui': path.resolve(monorepoRoot, 'packages/shared-ui/src'),
    '@business-logic': path.resolve(monorepoRoot, 'packages/business-logic/src'),
    '@api-client': path.resolve(monorepoRoot, 'packages/api-client/src'),
    '@constants': path.resolve(monorepoRoot, 'packages/constants/src'),
  },
}
```

## Usage Examples

### Platform Detection

```typescript
import { Platform } from '@shared'

console.log('Platform:', Platform.OS) // 'web' | 'native'
console.log('Is mobile:', Platform.isMobile)
console.log('Is web:', Platform.isWeb)

// Platform-specific code
const buttonStyle = Platform.select({
  web: { cursor: 'pointer' },
  native: { elevation: 2 },
  default: {}
})
```

### Cross-Platform Storage

```typescript
import { Storage } from '@shared'

// Save user data
await Storage.setObject('user', { id: 1, name: 'John' })

// Retrieve user data
const user = await Storage.getObject('user')

// Works on both web (localStorage) and React Native (AsyncStorage)
```

### Shared UI Components

```tsx
import { Button, Card, Text, View } from '@shared-ui'

const MyComponent = () => (
  <View style={{ padding: 16 }}>
    <Card>
      <Text variant="h3">Cross-Platform Title</Text>
      <Text variant="body">This works on both web and native!</Text>
      
      <Button 
        variant="primary"
        onPress={() => console.log('Works on both platforms!')}
      >
        Click Me
      </Button>
    </Card>
  </View>
)
```

### Shared Business Logic

```typescript
import { useMonorepoStats } from '@business-logic'
import { validateEmail, formatCurrency } from '@shared'

const MyScreen = () => {
  const stats = useMonorepoStats()
  
  const isValidEmail = validateEmail('user@example.com')
  const price = formatCurrency(1234.56, 'NGN')
  
  return (
    <div>
      <p>Build time: {stats.buildTime}s</p>
      <p>Coverage: {stats.coverage}%</p>
      <p>Price: {price}</p>
    </div>
  )
}
```

## Development Commands

### Web Development
```bash
npm run dev:web          # Start web development server
npm run build:web        # Build web application
```

### Mobile Development
```bash
npm run dev:mobile       # Start React Native Metro bundler
npm run android          # Run on Android
npm run ios              # Run on iOS
```

### Monorepo Management
```bash
npm run dev              # Start backend server
npm run build            # Build all packages
npm run check            # TypeScript type checking
```

## Type Safety

All packages are fully typed with TypeScript, ensuring type safety across platforms:

- Shared types in `@packages/shared/src/types.ts`
- Component prop types for all UI components
- API client with typed responses
- Platform-specific type handling

## Best Practices

1. **Platform Detection**: Always use `Platform.select()` for platform-specific code
2. **Storage**: Use the shared `Storage` API instead of direct localStorage/AsyncStorage
3. **Navigation**: Use shared navigation utilities where possible
4. **Styling**: Use React Native Web compatible styles in shared components
5. **Testing**: Write tests that work across platforms using shared utilities

## File Structure Best Practices

- Keep platform-specific code in separate files when necessary
- Use `.native.tsx` and `.web.tsx` extensions for platform-specific components
- Place shared logic in packages, platform-specific logic in apps
- Export everything through index files for clean imports

This setup provides a solid foundation for building cross-platform applications with maximum code reuse and type safety.