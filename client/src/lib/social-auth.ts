// Social Authentication Library
// Handles Google, Apple, and Facebook authentication

interface SocialAuthProvider {
  name: string;
  clientId: string;
  redirectUri: string;
}

interface SocialAuthConfig {
  google: SocialAuthProvider;
  apple: SocialAuthProvider;
  facebook: SocialAuthProvider;
}

interface SocialUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google' | 'apple' | 'facebook';
}

class SocialAuthManager {
  private config: SocialAuthConfig;
  private initialized: { [key: string]: boolean } = {};
  private onAuthSuccess: ((profile: SocialUserProfile) => Promise<void> | void) | null = null;
  private onAuthError: ((error: string, details?: any) => void) | null = null;
  private userRole: 'CONSUMER' | 'MERCHANT' | 'DRIVER' = 'CONSUMER';

  constructor() {
    this.config = {
      google: {
        name: 'Google',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/google/callback`
      },
      apple: {
        name: 'Apple',
        clientId: import.meta.env.VITE_APPLE_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/auth/apple/callback`
      },
      facebook: {
        name: 'Facebook',
        clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
        redirectUri: `${window.location.origin}/auth/facebook/callback`
      }
    };
  }

  // Initialize Google OAuth
  private async initializeGoogle(): Promise<void> {
    if (this.initialized.google) return;

    return new Promise((resolve, reject) => {
      // Load Google Identity Services
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        window.google?.accounts.id.initialize({
          client_id: this.config.google.clientId,
          callback: this.handleGoogleCallback.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true
        });
        this.initialized.google = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google SDK'));
      document.head.appendChild(script);
    });
  }

  // Initialize Facebook SDK
  private async initializeFacebook(): Promise<void> {
    if (this.initialized.facebook) return;

    return new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        window.FB?.init({
          appId: this.config.facebook.clientId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        this.initialized.facebook = true;
        resolve();
      };

      // Load Facebook SDK
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if (!window.fbAsyncInit) reject(new Error('Facebook SDK initialization failed'));
      };
      script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.head.appendChild(script);
    });
  }

  // Initialize Apple Sign In
  private async initializeApple(): Promise<void> {
    if (this.initialized.apple) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.onload = () => {
        window.AppleID?.auth.init({
          clientId: this.config.apple.clientId,
          scope: 'name email',
          redirectURI: this.config.apple.redirectUri,
          state: this.generateState(),
          usePopup: true
        });
        this.initialized.apple = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Apple SDK'));
      document.head.appendChild(script);
    });
  }

  // Handle Google login callback
  private handleGoogleCallback(response: any): void {
    try {
      const payload = this.parseJWT(response.credential);
      const profile: SocialUserProfile = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: 'google'
      };
      if (this.onAuthSuccess) {
        this.onAuthSuccess(profile);
      }
    } catch (error) {
      if (this.onAuthError) {
        this.onAuthError('Google authentication failed', error);
      }
    }
  }

  // Parse JWT token
  private parseJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  // Generate random state for security
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Google Sign In
  public async signInWithGoogle(): Promise<void> {
    try {
      await this.initializeGoogle();
      if (this.config.google.clientId) {
        window.google?.accounts.id.prompt();
      } else {
        throw new Error('Google Client ID not configured');
      }
    } catch (error) {
      if (this.onAuthError) {
        this.onAuthError('Google sign-in failed', error);
      }
    }
  }

  // Apple Sign In
  public async signInWithApple(): Promise<void> {
    try {
      await this.initializeApple();
      if (this.config.apple.clientId) {
        const response = await window.AppleID?.auth.signIn();
        if (response) {
          const profile: SocialUserProfile = {
            id: response.user,
            email: response.email || '',
            name: response.name ? `${response.name.firstName} ${response.name.lastName}` : '',
            provider: 'apple'
          };
          if (this.onAuthSuccess) {
            this.onAuthSuccess(profile);
          }
        }
      } else {
        throw new Error('Apple Client ID not configured');
      }
    } catch (error) {
      if (this.onAuthError) {
        this.onAuthError('Apple sign-in failed', error);
      }
    }
  }

  // Facebook Sign In
  public async signInWithFacebook(): Promise<void> {
    try {
      await this.initializeFacebook();
      if (this.config.facebook.clientId) {
        window.FB?.login((response: any) => {
          if (response.status === 'connected') {
            // Get user profile
            window.FB?.api('/me', { fields: 'id,name,email,picture' }, (profile: any) => {
              const userProfile: SocialUserProfile = {
                id: profile.id,
                email: profile.email || '',
                name: profile.name,
                picture: profile.picture?.data?.url,
                provider: 'facebook'
              };
              if (this.onAuthSuccess) {
                this.onAuthSuccess(userProfile);
              }
            });
          } else {
            throw new Error('Facebook login failed');
          }
        }, { scope: 'email,public_profile' });
      } else {
        throw new Error('Facebook App ID not configured');
      }
    } catch (error) {
      if (this.onAuthError) {
        this.onAuthError('Facebook sign-in failed', error);
      }
    }
  }

  // Sign out from all providers
  public async signOut(): Promise<void> {
    try {
      // Google sign out
      if (this.initialized.google && window.google) {
        window.google.accounts.id.disableAutoSelect();
      }

      // Facebook sign out
      if (this.initialized.facebook && window.FB) {
        window.FB.logout();
      }

      // Apple sign out (no explicit method available)
      
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  // Set callbacks for success and error
  public setCallbacks(
    onSuccess: (profile: SocialUserProfile) => Promise<void> | void,
    onError: (error: string, details?: any) => void
  ): void {
    this.onAuthSuccess = onSuccess;
    this.onAuthError = onError;
  }

  // Set role for new user registration
  public setUserRole(role: 'CONSUMER' | 'MERCHANT' | 'DRIVER'): void {
    this.userRole = role;
  }

  // Check if provider is configured
  public isProviderConfigured(provider: 'google' | 'apple' | 'facebook'): boolean {
    return !!this.config[provider].clientId;
  }
}

// Global type declarations
declare global {
  interface Window {
    google?: any;
    FB?: any;
    AppleID?: any;
    fbAsyncInit?: () => void;
  }
}

// Export singleton instance
export const socialAuth = new SocialAuthManager();
export type { SocialUserProfile };