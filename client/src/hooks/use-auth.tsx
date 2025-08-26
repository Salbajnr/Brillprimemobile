import { useState, useEffect, createContext, useContext } from 'react'

// Assuming authAPI is defined elsewhere and provides methods like signIn, signUp, validateSession
// For example:
// const authAPI = {
//   signIn: async ({ email, password }) => ({ success: true, user: { id: '1', email: 'test@example.com', fullName: 'Test User', role: 'CONSUMER' }, token: 'fake_token' }),
//   signUp: async ({ email, password, fullName, role }) => ({ success: true, user: { id: '2', email: email, fullName: fullName, role: role }, token: 'fake_token' }),
//   validateSession: async () => ({ id: '1', email: 'test@example.com', fullName: 'Test User', role: 'CONSUMER' })
// };

// Real API implementation
const authAPI = {
  signIn: async ({ email, password }: { email: string; password: string }) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return response;
  },
  signUp: async ({ email, password, fullName, role, phone }: { email: string; password: string; fullName: string; role: string; phone: string }) => {
    const response = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName, role, phone })
    });
    return response;
  },
  validateSession: async () => {
    const response = await apiRequest('/auth/validate-session');
    return response.success ? response.user : null;
  },
  logout: async () => {
    const response = await apiRequest('/auth/logout', { method: 'POST' });
    return response;
  },
  fetchUser: async () => {
    const response = await apiRequest('/auth/me');
    return response;
  },
  updateUser: async (userId: string, userData: Partial<User>) => {
    const response = await apiRequest(`/auth/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    return response;
  }
};


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
  login: (email: string, password: string) => Promise<User | null>
  logout: () => Promise<void>
  signup: (email: string, password: string, role?: string, fullName?: string, phone?: string) => Promise<any>
  isLoading: boolean
  loading: boolean
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  error: string | null;
  clearError: () => void;
  isAuthenticated: () => boolean;
  setIsAuthenticated: (value: boolean) => void; // Added for clarity if needed elsewhere
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

  // Handle cases where response might not be JSON (e.g., 204 No Content)
  if (response.status === 204) {
    return { success: response.ok, data: null, error: null, user: null };
  }

  const data = await response.json();

  // Generalize error handling: if response is not OK, return error from JSON body
  return {
    success: response.ok,
    data: response.ok ? data : null,
    error: response.ok ? null : data.message || data.error || 'Request failed',
    user: data.user, // Assuming user object might be returned on success
  };
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticatedState, setIsAuthenticated] = useState(false); // Internal state for authentication status

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First check if we have a stored user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('Stored user data:', userData);

          // Validate session with server
          const validUser = await authAPI.validateSession(); // Use authAPI.validateSession
          if (validUser) {
            setUser(validUser);
            setIsAuthenticated(true);
          } else {
            // Session invalid, clear stored data
            localStorage.removeItem('user');
            localStorage.removeItem('token'); // Also remove token
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          // No stored user, check session directly
          const validUser = await authAPI.validateSession();
          if (validUser) {
            setUser(validUser);
            setIsAuthenticated(true);
            localStorage.setItem('user', JSON.stringify(validUser));
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Also remove token
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false); // Set loading to false after initialization
        setIsLoading(false); // Also set overall loading to false
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    clearError();

    try {
      const result = await authAPI.signIn({ email, password });

      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(result.user));
        // Store token if provided
        if (result.data?.token) {
          localStorage.setItem('token', result.data.token);
        }
        return result.user;
      } else {
        throw new Error(result.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Login failed. Please check your credentials and try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, role?: string, fullName?: string, phone?: string) => {
    setLoading(true);
    clearError();

    try {
      // Ensure fullName is provided or default it
      const effectiveFullName = fullName || email.split('@')[0];

      const result = await authAPI.signUp({
        email,
        password,
        fullName: effectiveFullName,
        phone: phone || '',
        role: role || 'CONSUMER'
      });

      if (result.success) {
        // For Brill Prime, we typically require email verification
        // Store user info temporarily if provided but don't authenticate yet
        if (result.user) {
          // Store for potential use but don't set as authenticated
          localStorage.setItem('pending-user', JSON.stringify(result.user));
        }
        
        return {
          success: true,
          requiresEmailVerification: true,
          user: result.user,
          data: result.data
        };
      } else {
        throw new Error(result.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue to clear local state even if server logout fails
    } finally {
      setUser(null)
      localStorage.removeItem('user')
      localStorage.removeItem('token') // Clear token on logout
      setIsAuthenticated(false)
      // Consider clearing other related states if necessary
    }
  }

  const refreshUser = async (): Promise<void> => {
    // If no user is logged in, there's nothing to refresh
    if (!isAuthenticatedState && !user) {
      return;
    }
    try {
      // Assuming authAPI.fetchUser() fetches the currently logged-in user's data
      const response = await authAPI.fetchUser();
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true); // Ensure auth status is true if user data is fetched
        localStorage.setItem('user', JSON.stringify(response.user));
      } else {
        // If /auth/me fails, it's likely due to an expired token or invalid session
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setError(response.error || 'Session expired. Please log in again.');
      }
    } catch (err: any) {
      console.error('Failed to refresh user:', err);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setError(err.message || 'An error occurred while refreshing user data.');
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return; // Cannot update if no user is logged in
    setLoading(true);
    setError(null);
    try {
      // Assuming the API endpoint for updating a user is specific to the user's ID
      const response = await authAPI.updateUser(user.id, userData); // Use authAPI.updateUser

      if (!response.success) {
        throw new Error(response.error || 'Failed to update user');
      }

      // Update local user state and localStorage with the new data
      const updatedUser = response.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

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

  // Providing setIsAuthenticated in the context if needed by consuming components
  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, signup, isLoading, loading, refreshUser, updateUser, error, clearError, isAuthenticated, setIsAuthenticated }}>
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