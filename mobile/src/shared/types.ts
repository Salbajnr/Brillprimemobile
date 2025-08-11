
// Import types from web app's shared schema
export * from '../../../shared/schema';

// Mobile-specific types
export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface MobileUser {
  id: number;
  email: string;
  fullName: string;
  role: 'CONSUMER' | 'DRIVER' | 'MERCHANT' | 'ADMIN';
  phone?: string;
  profilePicture?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
