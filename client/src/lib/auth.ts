// Legacy auth API functions (deprecated)
export const legacyAuthAPI = {
  async signup(data: {
    email: string
    password: string
    fullName: string
    phone: string
    role: string
  }) {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Signup failed')
    }

    return response.json()
  },

  async signin(data: { email: string; password: string }) {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Signin failed')
    }

    return response.json()
  },

  async verifyOTP(data: { otp: string; phone: string }) {
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('OTP verification failed')
    }

    return response.json()
  },

  async logout() {
    // Clear local storage
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  },

  getCurrentUser() {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  getToken() {
    return localStorage.getItem('token')
  },

  setToken(token: string) {
    localStorage.setItem('token', token)
  },

  isAuthenticated() {
    return !!this.getToken() && !!this.getCurrentUser()
  }
}
export class AuthAPI {
  private baseURL = '/api/auth';

  async signUp(data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    role: string;
  }) {
    const response = await fetch(`${this.baseURL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign up failed');
    }

    return response.json();
  }

  async signIn(data: {
    email: string;
    password: string;
  }) {
    const response = await fetch(`${this.baseURL}/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Sign in failed');
    }

    const result = await response.json();

    // Store token if provided
    if (result.token) {
      localStorage.setItem('token', result.token);
    }

    return result;
  }

  async verifyOTP(data: {
    email: string;
    otp: string;
  }) {
    const response = await fetch(`${this.baseURL}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'OTP verification failed');
    }

    return response.json();
  }

  async signOut() {
    localStorage.removeItem('token');
    window.location.href = '/signin';
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

const verifyOtp = async (data: { email: string; otp: string }) => {
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'OTP verification failed');
  }

  return response.json();
};

const resendOtp = async (email: string) => {
  const response = await fetch('/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to resend OTP');
  }

  return response.json();
};

const socialLogin = async (provider: string, profile?: any) => {
  const response = await fetch('/api/auth/social-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, profile }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Social login failed');
  }

  return response.json();
};


export const authAPI = {
  signUp: new AuthAPI().signUp,
  signIn: new AuthAPI().signIn,
  verifyOTP: new AuthAPI().verifyOTP,
  signOut: new AuthAPI().signOut,
  getToken: new AuthAPI().getToken,
  isAuthenticated: new AuthAPI().isAuthenticated,
  verifyOtp,
  resendOtp,
  socialLogin
};