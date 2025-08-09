// Client-side social authentication utilities for Google, Apple, and Facebook

export interface SocialAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  error?: string;
}

export interface SocialProvider {
  name: string;
  id: string;
  icon: string;
  color: string;
}

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    name: 'Google',
    id: 'GOOGLE',
    icon: '🚀', // Replace with actual Google icon
    color: '#4285f4'
  },
  {
    name: 'Apple',
    id: 'APPLE', 
    icon: '🍎', // Replace with actual Apple icon
    color: '#000000'
  },
  {
    name: 'Facebook',
    id: 'FACEBOOK',
    icon: '📘', // Replace with actual Facebook icon
    color: '#1877f2'
  }
];

// Google Sign-In using Google Identity Services
export const signInWithGoogle = (): Promise<SocialAuthResult> => {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      resolve({ success: false, error: 'Google Sign-In not loaded' });
      return;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      resolve({ success: false, error: 'Google Client ID not configured' });
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          const result = await handleSocialLogin('GOOGLE', response.credential);
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Google authentication failed' });
        }
      }
    });

    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback to popup if prompt is not displayed
        window.google.accounts.id.renderButton(
          document.createElement('div'),
          { theme: 'outline', size: 'large' }
        );
      }
    });
  });
};

// Apple Sign-In using AppleID JS SDK
export const signInWithApple = (): Promise<SocialAuthResult> => {
  return new Promise((resolve) => {
    if (!window.AppleID) {
      resolve({ success: false, error: 'Apple Sign-In not loaded' });
      return;
    }

    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    if (!clientId) {
      resolve({ success: false, error: 'Apple Client ID not configured' });
      return;
    }

    window.AppleID.auth.init({
      clientId: clientId,
      scope: 'name email',
      redirectURI: window.location.origin,
      usePopup: true
    });

    window.AppleID.auth.signIn()
      .then(async (response: any) => {
        try {
          const result = await handleSocialLogin('APPLE', response.authorization.id_token, {
            name: response.user?.name ? 
              `${response.user.name.firstName || ''} ${response.user.name.lastName || ''}`.trim() : undefined,
            firstName: response.user?.name?.firstName,
            lastName: response.user?.name?.lastName
          });
          resolve(result);
        } catch (error) {
          resolve({ success: false, error: 'Apple authentication failed' });
        }
      })
      .catch(() => {
        resolve({ success: false, error: 'Apple authentication cancelled' });
      });
  });
};

// Facebook Login using Facebook SDK
export const signInWithFacebook = (): Promise<SocialAuthResult> => {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve({ success: false, error: 'Facebook SDK not loaded' });
      return;
    }

    window.FB.login((response: any) => {
      if (response.authResponse) {
        handleSocialLogin('FACEBOOK', response.authResponse.accessToken)
          .then(result => resolve(result))
          .catch(() => resolve({ success: false, error: 'Facebook authentication failed' }));
      } else {
        resolve({ success: false, error: 'Facebook authentication cancelled' });
      }
    }, { scope: 'email,public_profile' });
  });
};

// Generic social login handler that calls the backend
export const handleSocialLogin = async (
  provider: string, 
  token: string, 
  userInfo?: any
): Promise<SocialAuthResult> => {
  try {
    const response = await fetch('/api/auth/social-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        token,
        userInfo
      }),
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        user: data.user,
        token: data.token
      };
    } else {
      return {
        success: false,
        error: data.message || 'Social authentication failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error during authentication'
    };
  }
};

// Link additional social account to existing user
export const linkSocialAccount = async (provider: string): Promise<{ success: boolean; message: string }> => {
  try {
    let token: string | null = null;

    // Get the appropriate token based on provider
    switch (provider.toUpperCase()) {
      case 'GOOGLE':
        const googleResult = await signInWithGoogle();
        if (!googleResult.success) {
          return { success: false, message: googleResult.error || 'Google authentication failed' };
        }
        token = googleResult.token!;
        break;

      case 'APPLE':
        const appleResult = await signInWithApple();
        if (!appleResult.success) {
          return { success: false, message: appleResult.error || 'Apple authentication failed' };
        }
        token = appleResult.token!;
        break;

      case 'FACEBOOK':
        const facebookResult = await signInWithFacebook();
        if (!facebookResult.success) {
          return { success: false, message: facebookResult.error || 'Facebook authentication failed' };
        }
        token = facebookResult.token!;
        break;

      default:
        return { success: false, message: 'Unsupported social provider' };
    }

    const response = await fetch('/api/auth/link-social', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: provider.toUpperCase(),
        token
      }),
      credentials: 'include'
    });

    const data = await response.json();
    return {
      success: data.success,
      message: data.message
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to link social account'
    };
  }
};

// Get user's linked social accounts
export const getLinkedSocialAccounts = async () => {
  try {
    const response = await fetch('/api/auth/social-accounts', {
      method: 'GET',
      credentials: 'include'
    });

    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        accounts: data.linkedAccounts
      };
    } else {
      return {
        success: false,
        error: data.message || 'Failed to fetch linked accounts'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
};

// Unlink social account
export const unlinkSocialAccount = async (provider: string) => {
  try {
    const response = await fetch(`/api/auth/social-accounts/${provider}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    return {
      success: data.success,
      message: data.message
    };

  } catch (error) {
    return {
      success: false,
      message: 'Failed to unlink social account'
    };
  }
};

// Initialize social authentication SDKs
export const initializeSocialAuth = () => {
  // Initialize Google Sign-In
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (googleClientId && !document.querySelector('script[src*="accounts.google.com"]')) {
    const googleScript = document.createElement('script');
    googleScript.src = 'https://accounts.google.com/gsi/client';
    googleScript.async = true;
    googleScript.defer = true;
    document.head.appendChild(googleScript);
  }

  // Initialize Apple Sign-In
  const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
  if (appleClientId && !document.querySelector('script[src*="appleid.cdn-apple.com"]')) {
    const appleScript = document.createElement('script');
    appleScript.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
    appleScript.async = true;
    document.head.appendChild(appleScript);
  }

  // Initialize Facebook SDK
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (facebookAppId && !window.FB) {
    (window as any).fbAsyncInit = function() {
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
    };

    if (!document.querySelector('script[src*="connect.facebook.net"]')) {
      const facebookScript = document.createElement('script');
      facebookScript.src = 'https://connect.facebook.net/en_US/sdk.js';
      facebookScript.async = true;
      facebookScript.defer = true;
      document.head.appendChild(facebookScript);
    }
  }
};

// Type declarations for global objects
declare global {
  interface Window {
    google: any;
    AppleID: any;
    FB: any;
  }
}