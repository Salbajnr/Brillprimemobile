import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileConfig } from '../shared/config';
import { apiService } from '../services/api';
import { databaseSyncService } from '../services/databaseSync';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: any) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    checkAuthStatus();

    // Set up periodic session validation
    const sessionInterval = setInterval(validateSession, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(sessionInterval);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const sessionId = await AsyncStorage.getItem('sessionId');

      if (token && userData && sessionId) {
        const user = JSON.parse(userData);
        setUser(user);

        // Validate session with server
        await validateSession();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      await logout(); // Clear invalid data
    } finally {
      setIsLoading(false);
    }
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setSessionValid(false);
        return false;
      }

      const response = await fetch(`${mobileConfig.apiBaseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Update user data if needed
          const currentUser = await AsyncStorage.getItem('userData');
          const parsedUser = currentUser ? JSON.parse(currentUser) : null;

          if (JSON.stringify(parsedUser) !== JSON.stringify(data.user)) {
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            setUser(data.user);
          }

          setSessionValid(true);
          return true;
        }
      }

      // Session invalid
      setSessionValid(false);
      await logout();
      return false;
    } catch (error) {
      console.error('Session validation failed:', error);
      setSessionValid(false);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiService.post('/auth/signin', { email, password });

      if (response.success && response.data) {
        setUser(response.data.user);
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('sessionId', response.data.sessionId); // Assuming sessionId is returned

        // Verify database sync after successful login
        const syncStatus = await databaseSyncService.verifySyncStatus();
        if (!syncStatus.success) {
          console.warn('⚠️ Database sync verification failed, but login successful');
        }

        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Sign in failed'
        };
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error.message || 'Sign in failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (userData: any) => {
    try {
      setIsLoading(true);
      const response = await apiService.post('/auth/signup', userData);
      // Assuming signup also returns token, user data, and sessionId
      if (response.success && response.data) {
        setUser(response.data.user);
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('sessionId', response.data.sessionId);
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Sign up failed'
        };
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Sign up failed'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setSessionValid(false);
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('sessionId');
  };

  const signOut = async () => {
    await logout();
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user && sessionValid,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};