// Simplified auth hook for demonstration
import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simple mock user for demonstration
  useEffect(() => {
    const mockUser: User = {
      id: '1',
      name: 'Demo User',
      email: 'demo@brillprime.com',
      role: 'CONSUMER'
    };
    setUser(mockUser);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Mock login logic
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
  };

  const isAuthenticated = () => !!user;

  return { user, isLoading, login, logout, isAuthenticated };
}