/**
 * Example usage of shared packages in React Native
 * This demonstrates how to import and use cross-platform code
 */

// Import shared utilities
import { 
  Platform, 
  Storage, 
  validateEmail, 
  formatCurrency, 
  generateId,
  COLORS,
  APP_CONFIG 
} from '@shared'

// Import shared UI components (React Native compatible)
import { Button, Card, Badge, Text, View } from '@shared-ui'

// Import business logic hooks
import { useMonorepoStats } from '@business-logic'

// Import API client
import { ApiClient } from '@api-client'

export const ExampleUsage = {
  // Platform detection
  checkPlatform: () => {
    console.log('Current platform:', Platform.OS)
    console.log('Is native app:', Platform.isNative)
    console.log('Is mobile:', Platform.isMobile)
  },

  // Storage operations
  saveUserData: async (userData: any) => {
    try {
      await Storage.setObject('user', userData)
      console.log('User data saved successfully')
    } catch (error) {
      console.error('Failed to save user data:', error)
    }
  },

  // Validation
  validateUserInput: (email: string) => {
    const result = validateEmail(email)
    if (!result.isValid) {
      console.error('Validation error:', result.error)
    }
    return result.isValid
  },

  // Formatting
  displayPrice: (amount: number) => {
    return formatCurrency(amount, 'NGN', 'en-NG')
  },

  // Generate unique IDs
  createId: () => {
    return generateId()
  },

  // Use constants
  getAppColor: () => {
    return COLORS.primary
  },

  // API client setup
  setupApiClient: () => {
    return new ApiClient({
      baseUrl: APP_CONFIG.api.baseUrl,
      timeout: APP_CONFIG.api.timeout
    })
  }
}

// Example React Native component using shared packages
export const ExampleComponent = () => {
  const stats = useMonorepoStats()

  return (
    <View style={{ padding: 16 }}>
      <Text variant="h3">Cross-Platform Example</Text>
      
      <Card style={{ marginVertical: 8 }}>
        <Text>Platform: {Platform.OS}</Text>
        <Text>Build time: {stats.buildTime}s</Text>
        <Text>Coverage: {stats.coverage}%</Text>
      </Card>

      <Button 
        variant="primary" 
        onPress={() => ExampleUsage.checkPlatform()}
      >
        Check Platform
      </Button>

      <Badge variant="success">
        Shared Package Working!
      </Badge>
    </View>
  )
}