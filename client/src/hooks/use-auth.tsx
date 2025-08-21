import { useState, useEffect, createContext, useContext } from 'react'

interface User {
  id: string
  email: string
  fullName: string
  role: 'CONSUMER' | 'MERCHANT' | 'DRIVER' | 'ADMIN'
  name?: string
  profileImageUrl?: string
}

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  signup: (email: string, password: string, role: string) => Promise<void>
  isLoading: boolean
  loading: boolean
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  error: string | null;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null)

// Simple fetch wrapper for API calls
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`/api${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  return {
    success: response.ok,
    data: response.ok ? data : null,
    error: response.ok ? null : data.message || 'Request failed',
    user: data.user,
  };
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Renamed from isLoading to loading for clarity if needed, but keeping original name for now

  useEffect(() => {
    // Check for existing session both from localStorage and server validation
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          
          // Validate session with server
          try {
            const response = await apiRequest('/auth/validate-session');
            if (!response.success) {
              // Session invalid, clear local data
              localStorage.removeItem('user')
              setUser(null)
            } else if (response.user) {
              // Update user data with fresh server data
              setUser(response.user)
              localStorage.setItem('user', JSON.stringify(response.user))
            }
          } catch (error) {
            console.error('Session validation failed:', error)
            // Keep local user for offline functionality but mark as potentially stale
          }
        } catch (error) {
          console.error('Error parsing stored user:', error)
          localStorage.removeItem('user')
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null);
    try {
      const response = await apiRequest('/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }

      const data = response;
      setUser(data.data?.user || data.user);
      localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));
    } catch (err: any) {
      setError(err.message);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }

  const signup = async (email: string, password: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, role })
      });

      if (!response.success) {
        throw new Error(response.error || 'Signup failed');
      }

      const data = response;
      setUser(data.data?.user || data.user);
      localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));
    } catch (err: any) {
      setError(err.message);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    try {
      // Call server logout endpoint
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state regardless of server response
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('selectedRole')
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiRequest("/auth/me");
      if (response.success) {
        setUser(response.data?.user || response.user);
      } else {
        // If /auth/me fails, it's likely due to an expired token or invalid session
        setUser(null);
        localStorage.removeItem('user');
        setError(response.error || 'Session expired. Please log in again.');
      }
    } catch (err: any) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      localStorage.removeItem('user');
      setError(err.message || 'An error occurred while refreshing user data.');
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update user');
      }

      const updatedUserData = response;
      setUser(updatedUserData.data?.user || updatedUserData.user);
      localStorage.setItem('user', JSON.stringify(updatedUserData.data?.user || updatedUserData.user));
    } catch (err: any) {
      setError(err.message);
      console.error('Update user error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const isAuthenticated = () => !!user;


  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, signup, isLoading, loading, refreshUser, updateUser, error, clearError, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}