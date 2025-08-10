// Authentication API functions
export const authAPI = {
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