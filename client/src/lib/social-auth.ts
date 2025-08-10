// Social authentication library for Google, Apple, and Facebook
declare global {
  interface Window {
    google?: any;
    FB?: any;
    AppleID?: any;
  }
}

interface SocialProfile {
  id: string
  email: string
  name: string
  provider: 'google' | 'apple' | 'facebook'
  avatar?: string
}

interface SocialAuthCallbacks {
  onSuccess: (profile: SocialProfile) => Promise<void>
  onError: (error: Error) => void
}

class SocialAuth {
  private callbacks?: SocialAuthCallbacks
  private googleInitialized = false
  private facebookInitialized = false
  private appleInitialized = false

  setCallbacks(onSuccess: (profile: SocialProfile) => Promise<void>, onError: (error: Error) => void) {
    this.callbacks = { onSuccess, onError }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      if (!this.googleInitialized) {
        throw new Error('Google Sign-In not initialized')
      }

      if (!window.google?.accounts) {
        // Fallback to API call for server-side verification
        const response = await fetch('/api/auth/social-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'google' })
        });

        if (!response.ok) {
          throw new Error('Google authentication failed')
        }

        const data = await response.json();
        if (data.success && this.callbacks?.onSuccess) {
          await this.callbacks.onSuccess(data.profile)
        }
        return;
      }

      window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'email profile',
        callback: async (response: any) => {
          try {
            const userInfo = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`);
            const profile = await userInfo.json();
            
            const socialProfile: SocialProfile = {
              id: profile.id,
              email: profile.email,
              name: profile.name,
              provider: 'google',
              avatar: profile.picture
            }
            
            if (this.callbacks?.onSuccess) {
              await this.callbacks.onSuccess(socialProfile)
            }
          } catch (error) {
            if (this.callbacks?.onError) {
              this.callbacks.onError(error as Error)
            }
          }
        }
      }).requestAccessToken();

    } catch (error) {
      if (this.callbacks?.onError) {
        this.callbacks.onError(error as Error)
      }
    }
  }

  async signInWithApple(): Promise<void> {
    try {
      if (!this.appleInitialized) {
        throw new Error('Apple Sign-In not initialized')
      }

      if (!window.AppleID) {
        // Fallback to API call
        const response = await fetch('/api/auth/social-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'apple' })
        });

        if (!response.ok) {
          throw new Error('Apple authentication failed')
        }

        const data = await response.json();
        if (data.success && this.callbacks?.onSuccess) {
          await this.callbacks.onSuccess(data.profile)
        }
        return;
      }

      window.AppleID.auth.signIn().then((response: any) => {
        const { authorization } = response;
        const socialProfile: SocialProfile = {
          id: authorization.user,
          email: authorization.email || '',
          name: `${authorization.name?.firstName || ''} ${authorization.name?.lastName || ''}`.trim(),
          provider: 'apple'
        }
        
        if (this.callbacks?.onSuccess) {
          this.callbacks.onSuccess(socialProfile)
        }
      });

    } catch (error) {
      if (this.callbacks?.onError) {
        this.callbacks.onError(error as Error)
      }
    }
  }

  async signInWithFacebook(): Promise<void> {
    try {
      if (!this.facebookInitialized) {
        throw new Error('Facebook SDK not initialized')
      }

      if (!window.FB) {
        // Fallback to API call
        const response = await fetch('/api/auth/social-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'facebook' })
        });

        if (!response.ok) {
          throw new Error('Facebook authentication failed')
        }

        const data = await response.json();
        if (data.success && this.callbacks?.onSuccess) {
          await this.callbacks.onSuccess(data.profile)
        }
        return;
      }

      window.FB.login((response: any) => {
        if (response.authResponse) {
          window.FB.api('/me', { fields: 'name,email,picture' }, (userInfo: any) => {
            const socialProfile: SocialProfile = {
              id: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              provider: 'facebook',
              avatar: userInfo.picture?.data?.url
            }
            
            if (this.callbacks?.onSuccess) {
              this.callbacks.onSuccess(socialProfile)
            }
          });
        } else {
          if (this.callbacks?.onError) {
            this.callbacks.onError(new Error('Facebook login cancelled'))
          }
        }
      }, { scope: 'email' });

    } catch (error) {
      if (this.callbacks?.onError) {
        this.callbacks.onError(error as Error)
      }
    }
  }

  // Initialize social auth providers
  async initialize(): Promise<void> {
    try {
      // Initialize Google
      await this.initializeGoogle();
      
      // Initialize Facebook
      await this.initializeFacebook();
      
      // Initialize Apple
      await this.initializeApple();

      console.log('Social auth providers initialized')
    } catch (error) {
      console.error('Failed to initialize social auth:', error)
    }
  }

  private async initializeGoogle(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });

        this.googleInitialized = true;
      }
    } catch (error) {
      console.warn('Google Sign-In initialization failed:', error);
    }
  }

  private async initializeFacebook(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && import.meta.env.VITE_FACEBOOK_APP_ID) {
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = () => {
            window.FB.init({
              appId: import.meta.env.VITE_FACEBOOK_APP_ID,
              cookie: true,
              xfbml: true,
              version: 'v18.0'
            });
            resolve(null);
          };
        });

        this.facebookInitialized = true;
      }
    } catch (error) {
      console.warn('Facebook SDK initialization failed:', error);
    }
  }

  private async initializeApple(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && import.meta.env.VITE_APPLE_CLIENT_ID) {
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = () => {
            window.AppleID.auth.init({
              clientId: import.meta.env.VITE_APPLE_CLIENT_ID,
              scope: 'name email',
              redirectURI: `${window.location.origin}/auth/apple/callback`,
              usePopup: true
            });
            resolve(null);
          };
        });

        this.appleInitialized = true;
      }
    } catch (error) {
      console.warn('Apple Sign-In initialization failed:', error);
    }
  }

  // Check if providers are available
  isGoogleAvailable(): boolean {
    return this.googleInitialized && !!import.meta.env.VITE_GOOGLE_CLIENT_ID
  }

  isAppleAvailable(): boolean {
    return this.appleInitialized && !!import.meta.env.VITE_APPLE_CLIENT_ID
  }

  isFacebookAvailable(): boolean {
    return this.facebookInitialized && !!import.meta.env.VITE_FACEBOOK_APP_ID
  }
}

export const socialAuth = new SocialAuth()

// Initialize on module load
socialAuth.initialize().catch(console.error)