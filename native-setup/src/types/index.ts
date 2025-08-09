// Re-export all types from the shared schema
export * from './schema';

// Additional native-specific types
export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface LocationPermission {
  granted: boolean;
  message?: string;
}

export interface CameraPermission {
  granted: boolean;
  message?: string;
}

export interface PushNotificationPermission {
  granted: boolean;
  token?: string;
}

export interface BiometricPermission {
  available: boolean;
  type?: 'TouchID' | 'FaceID' | 'Fingerprint' | 'None';
}

export interface NativeConfiguration {
  apiBaseUrl: string;
  websocketUrl: string;
  paystackPublicKey: string;
  googleMapsApiKey: string;
  firebaseConfig: {
    projectId: string;
    appId: string;
    apiKey: string;
  };
}

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  selectedRole: UserRole | null;
  permissions: {
    location: LocationPermission;
    camera: CameraPermission;
    pushNotifications: PushNotificationPermission;
    biometric: BiometricPermission;
  };
  configuration: NativeConfiguration;
}

// Navigation stack types
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  RoleSelection: undefined;
  SignUp: { role?: UserRole };
  SignIn: undefined;
  ForgotPassword: undefined;
  OTPVerification: { email: string; purpose: 'signup' | 'reset' };
  ConsumerHome: undefined;
  MerchantDashboard: undefined;
  DriverDashboard: undefined;
  AdminDashboard: undefined;
  Profile: undefined;
  Wallet: undefined;
  Orders: undefined;
  Chat: { roomId?: string };
  Notifications: undefined;
  Scanner: { type: 'qr' | 'barcode' };
  Maps: { orderId?: string };
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Orders: undefined;
  Chat: undefined;
  Profile: undefined;
};

// API Response types (matching backend)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Real-time event types
export interface RealTimeEvent {
  type: 'order_update' | 'delivery_update' | 'chat_message' | 'notification' | 'location_update';
  data: any;
  timestamp: Date;
  userId?: number;
  roomId?: string;
}

// Push notification types
export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
  category?: string;
}