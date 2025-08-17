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
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  error: string | null;
  clearError: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null)

// Mock apiRequest function for demonstration purposes
const apiRequest = async (method: string, url: string, body?: any): Promise<Response> => {
  // In a real app, this would be your actual API call logic
  console.log(`Mock API Request: ${method} ${url}`, body);
  if (url === "/api/auth/me" && method === "GET") {
    // Simulate a user response
    return new Response(JSON.stringify({ user: { id: "1", email: "test@example.com", fullName: "Test User", role: "CONSUMER" } }), { status: 200 });
  }
  if (url === "/api/auth/signin" && method === "POST") {
    // Simulate login success
    return new Response(JSON.stringify({ user: { id: "1", email: "test@example.com", fullName: "Test User", role: "CONSUMER" } }), { status: 200 });
  }
  if (url === "/api/auth/signup" && method === "POST") {
    // Simulate signup success
    return new Response(JSON.stringify({ user: { id: "2", email: "newuser@example.com", fullName: "New User", role: body.role } }), { status: 200 });
  }
  if (url.startsWith("/api/users/") && method === "PUT") {
    // Simulate user update
    return new Response(JSON.stringify({ user: { ...body, id: url.split("/")[2] } }), { status: 200 });
  }
  return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
};


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Renamed from isLoading to loading for clarity if needed, but keeping original name for now

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null);
    try {
      const response = await apiRequest('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
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
      const response = await apiRequest('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, role }) });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Signup failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err: any) {
      setError(err.message);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`PUT`, `/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const updatedUserData = await response.json();
      setUser(updatedUserData.user);
      localStorage.setItem('user', JSON.stringify(updatedUserData.user));
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
    <AuthContext.Provider value={{ user, setUser, login, logout, signup, isLoading: isLoading || loading, refreshUser, updateUser, error, clearError, isAuthenticated }}>
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