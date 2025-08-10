import { useState, useEffect, createContext, useContext } from 'react';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  selectedRole: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | null;
  setUser: (user: User | null) => void;
  setSelectedRole: (role: 'CONSUMER' | 'MERCHANT' | 'DRIVER') => void;
  isAuthenticated: () => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Return default values for now - simplified for role selection
    const [selectedRole, setSelectedRole] = useState<'CONSUMER' | 'MERCHANT' | 'DRIVER' | null>(null);
    return {
      user: null,
      selectedRole,
      setUser: () => {},
      setSelectedRole,
      isAuthenticated: () => false,
      logout: () => {}
    };
  }
  return context;
}