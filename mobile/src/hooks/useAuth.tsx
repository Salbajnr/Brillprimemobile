
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileConfig } from '../shared/config';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(mobileConfig.storageKeys.userSession);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${mobileConfig.apiBaseUrl}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
        const userData = data.data.user;
        setUser(userData);
        await AsyncStorage.setItem(mobileConfig.storageKeys.userSession, JSON.stringify(userData));
      } else {
        throw new Error(data.error || 'Sign in failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch(`${mobileConfig.apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();
      if (data.success) {
        const userData = data.data.user;
        setUser(userData);
        await AsyncStorage.setItem(mobileConfig.storageKeys.userSession, JSON.stringify(userData));
      } else {
        throw new Error(data.error || 'Sign up failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem(mobileConfig.storageKeys.userSession);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
