export const localStorage = {
  getItem: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Handle storage quota exceeded or other errors silently
    }
  },

  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Handle errors silently
    }
  },

  getUser: () => {
    try {
      const userData = window.localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  setVerificationEmail(email: string): void {
    this.setItem('verification-email', email);
  },

  getVerificationEmail(): string | null {
    return this.getItem('verification-email');
  },

  removeVerificationEmail(): void {
    this.removeItem('verification-email');
  },
};